import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlus, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-context";
import { translateError } from "@/lib/i18n/localized-error";
import { ToolHeader } from "@/components/tool-header";
import { ToolTabs } from "@/components/tool-tabs";
import { ToolSeoContent } from "@/components/tool-seo-content";
import { LicenseFooter } from "@/components/license-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popconfirm } from "@/components/ui/popconfirm";
import { CENTERED_CROP, cropGeometry, resizeDimensions, validTarget, type CropPosition } from "@/lib/id-photo-geometry";
import { DEFAULT_ID_PHOTO_PRESET, ID_PHOTO_PRESETS, ID_PHOTO_PRESET_LABEL_KEY, type IdPhotoPresetId } from "@/lib/id-photo-presets";
import { importPhotos, releasePhoto, type PhotoAsset } from "@/lib/id-photo-assets";
import { downloadPhotos, encodePhoto } from "@/lib/id-photo-export";
import { activePhotoResults, PhotoBatch, type PhotoResult } from "@/lib/id-photo-state";
import { deriveModeState } from "@/lib/tool-mode";
import { CropPreview } from "./CropPreview";

export function IdPhoto({ active = true }: { active?: boolean }) {
  const [assets, setAssets] = useState<PhotoAsset[]>([]);
  const assetsRef = useRef<PhotoAsset[]>([]);
  const sequenceRef = useRef(0);
  const importGeneration = useRef(0);
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const [batch] = useState(() => new PhotoBatch());
  const [selectedId, setSelectedId] = useState("");
  const [mode, setMode] = useState("fixed");
  const [presetId, setPresetId] = useState<IdPhotoPresetId>(DEFAULT_ID_PHOTO_PRESET.id);
  const t = useT();
  const [axis, setAxis] = useState<"width" | "height">("width");
  const [targetText, setTargetText] = useState("");
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [importing, setImporting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<Record<string, PhotoResult>>({});
  const preset = ID_PHOTO_PRESETS.find(p => p.id === presetId) ?? DEFAULT_ID_PHOTO_PRESET;
  const selected = assets.find(a => a.id === selectedId) ?? assets[0];
  const locked = importing || processing;
  const context = `${mode}:${presetId}:${axis}:${targetText}:${settingsVersion}`;
  const effectiveResults = useMemo(() => activePhotoResults(assets, results, context), [assets, results, context]);
  const modeState = deriveModeState({ assetCount: assets.length, processedCount: Object.keys(effectiveResults).length, processing, progress });
  const targetFor = (asset: PhotoAsset) => mode === "fixed" ? preset : resizeDimensions(asset, axis, targetText);
  const targetStatus = (asset: PhotoAsset) => {
    try { const size = targetFor(asset); return `${size.width} × ${size.height} px`; }
    catch (error) { return translateError(t, error) || t("err.idPhoto.invalidDimensions"); }
  };
  const inputInvalid = mode !== "fixed" && !validTarget(targetText);
  const hasValidTarget = mode === "fixed" || assets.some(asset => {
    try { targetFor(asset); return true; } catch { return false; }
  });

  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => () => {
    importGeneration.current++;
    batch.cancel();
    assetsRef.current.forEach(releasePhoto);
  }, [batch]);
  useEffect(() => {
    if (active) return;
    batch.cancel();
    busy.current = false;
    // Route visibility is external to the editor; reset its feedback on the next tick.
    const timer = window.setTimeout(() => setProcessing(false), 0);
    return () => window.clearTimeout(timer);
  }, [active, batch]);

  const addFiles = async (files: readonly File[]) => {
    if (!files.length || busy.current) return;
    busy.current = true;
    setImporting(true);
    const generation = ++importGeneration.current;
    const imported = await importPhotos(files, () => importGeneration.current === generation);
    if (imported.cancelled) return;
    const added = imported.loaded.map(asset => ({ ...asset, sequence: ++sequenceRef.current }));
    if (added.length) {
      const combined = [...assetsRef.current, ...added];
      assetsRef.current = combined;
      setAssets(combined);
      setSelectedId(current => current || added[0].id);
      setTargetText(current => current || String(added[0].width));
    }
    if (imported.failures.length) toast.error(t("idPhoto.importFailed", imported.failures.length), { description: imported.failures.join("; ") });
    busy.current = false;
    setImporting(false);
  };
  const clearAll = () => {
    importGeneration.current++;
    batch.cancel();
    assets.forEach(releasePhoto);
    assetsRef.current = [];
    setAssets([]); setSelectedId(""); setResults({});
  };
  const remove = (asset: PhotoAsset) => {
    releasePhoto(asset);
    const remaining = assets.filter(a => a.id !== asset.id);
    assetsRef.current = remaining;
    setAssets(remaining);
    setResults(current => { const next = { ...current }; delete next[asset.id]; return next; });
  };
  const changeCrop = useCallback((id: string, crop: CropPosition) => {
    setAssets(current => current.map(asset => asset.id === id ? { ...asset, crop, revision: asset.revision + 1 } : asset));
  }, []);
  const changeSetting = (update: () => void) => { update(); setSettingsVersion(v => v + 1); };
  const processAll = async () => {
    if (busy.current || inputInvalid || !hasValidTarget || !assets.length || !active) return;
    busy.current = true;
    setProcessing(true); setProgress({ current: 0, total: assets.length });
    const output = await batch.run(assets, async asset => {
      const target = targetFor(asset);
      const rect = mode === "fixed" ? cropGeometry(asset, target, asset.crop).rect : { x: 0, y: 0, width: asset.width, height: asset.height };
      return { ...await encodePhoto(asset.image, rect, target, asset.file, asset.sequence), context, revision: asset.revision };
    }, (current, total) => setProgress({ current, total }));
    if (!batch.current(output.id) || output.cancelled) return;
    setResults(Object.fromEntries(output.results.map(({ item, result }) => [item.id, result])));
    if (output.failures.length) toast.error(
      t("idPhoto.processPartial", output.results.length, output.failures.length),
      {
        description: t(
          "idPhoto.processPartialBody",
          output.failures
            .map(({ item, error }) => `${item.file.name}: ${error}`)
            .join("; "),
        ),
      },
    );
    else toast.success(t("idPhoto.processDone", output.results.length));
    busy.current = false; setProcessing(false);
  };
  const stop = () => {
    batch.cancel(); busy.current = false; setProcessing(false);
    toast.info(t("idPhoto.stopped"), { description: t("idPhoto.stoppedBody") });
  };

  return (
    <main className="app-shell image-app id-photo-app">
      <ToolHeader route="id-photo" trailing={assets.length ? <Popconfirm
        title={t("idPhoto.clearTitle")} description={t("idPhoto.clearDescription", assets.length)}
        onConfirm={clearAll} trigger={<Button variant="outline" disabled={locked}><Trash2 />{t("idPhoto.clearTrigger")}</Button>} /> : undefined} />
      <section className="id-photo-editor" aria-label={t("idPhoto.editorLabel")}>
        <div className="id-photo-heading"><div><p className="eyebrow">{t("img.eyebrow")}</p><h1>{t("idPhoto.title")}</h1><p>{t("idPhoto.lead")}</p></div><ToolTabs group="image" active="id-photo" /></div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple hidden
          onChange={event => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
        {!assets.length ? <Card className="id-photo-empty"
          onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)); }}>
          <ImagePlus aria-hidden="true" /><h2>{t("idPhoto.emptyTitle")}</h2><p>{t("idPhoto.emptyHint")}</p>
          <Button size="lg" disabled={importing} onClick={() => input.current?.click()}>{importing ? <LoaderCircle className="spin" /> : <ImagePlus />} {importing ? t("idPhoto.importing") : t("idPhoto.selectImages")}</Button>
        </Card> : <div className="id-photo-workspace">
          <Card className="id-photo-list"><div className="id-photo-panel-heading"><h2>{t("idPhoto.listTitle", assets.length)}</h2><Button variant="outline" size="sm" disabled={locked} onClick={() => input.current?.click()}>{t("idPhoto.append")}</Button></div>
            <div className="id-photo-list-items">{assets.map(asset => <div className="id-photo-list-item" key={asset.id}>
              <Button variant="ghost" className="id-photo-select" disabled={locked} aria-pressed={selected?.id === asset.id} onClick={() => setSelectedId(asset.id)}>
                <img src={asset.url} alt="" /><span><strong>{asset.file.name}</strong><small>{asset.width} × {asset.height} px</small><small>{targetStatus(asset)}{effectiveResults[asset.id] ? t("idPhoto.doneSuffix") : ""}</small></span>
              </Button><Button variant="ghost" size="icon" disabled={locked} aria-label={t("idPhoto.remove", asset.file.name)} onClick={() => remove(asset)}><Trash2 /></Button>
            </div>)}</div>
          </Card>
          <Card className="id-photo-preview"><div className="id-photo-panel-heading"><h2>{mode === "fixed" ? t("idPhoto.previewCrop") : t("idPhoto.previewFull")}</h2><span>{selected && targetStatus(selected)}</span></div>
            {selected && (mode === "fixed" ? <CropPreview asset={selected} target={preset} disabled={locked} onChange={crop => changeCrop(selected.id, crop)} /> : <div className="id-photo-full"><img src={selected.url} alt={selected.file.name} /></div>)}
            <p id="id-photo-crop-help" className="id-photo-preview-help">{mode === "fixed" ? t("idPhoto.cropHelp") : t("idPhoto.fullHelp")}</p>
          </Card>
          <Card className="id-photo-settings"><h2>{t("idPhoto.settingsTitle")}</h2>
            <ToggleGroup type="single" value={mode} disabled={locked} aria-label={t("idPhoto.modeLabel")} onValueChange={value => { if (value && value !== mode) changeSetting(() => setMode(value)); }}>
              <ToggleGroupItem value="fixed">{t("idPhoto.modeFixed")}</ToggleGroupItem><ToggleGroupItem value="custom">{t("idPhoto.modeCustom")}</ToggleGroupItem>
            </ToggleGroup>
            {mode === "fixed" ? <>
              <ToggleGroup type="single" value={presetId} disabled={locked} aria-label={t("idPhoto.presetLabel")} onValueChange={value => {
                if (value && value !== presetId) changeSetting(() => {
                  setPresetId(value as IdPhotoPresetId);
                  setAssets(current => current.map(asset => ({ ...asset, crop: { ...CENTERED_CROP }, revision: asset.revision + 1 })));
                });
              }}>{ID_PHOTO_PRESETS.map(p => <ToggleGroupItem value={p.id} key={p.id}>{t(ID_PHOTO_PRESET_LABEL_KEY[p.id])}</ToggleGroupItem>)}</ToggleGroup>
              <div className="id-photo-size"><strong>{preset.width} × {preset.height}<span> px</span></strong><p>{t("idPhoto.ppiNote", preset.widthMm, preset.heightMm)}</p></div>
              <div className="id-photo-zoom-label"><label htmlFor="id-photo-zoom">{t("idPhoto.zoom")}</label><span>{Math.round((selected?.crop.zoom ?? 1) * 100)}%</span></div>
              <Slider id="id-photo-zoom" aria-label={t("idPhoto.zoom")} min={100} max={400} step={1} value={[Math.round((selected?.crop.zoom ?? 1) * 100)]} disabled={locked}
                onValueChange={([value]) => { if (selected) changeCrop(selected.id, cropGeometry(selected, preset, { ...selected.crop, zoom: value / 100 }).position); }} />
              <Button variant="outline" disabled={locked} onClick={() => { if (selected) changeCrop(selected.id, { ...CENTERED_CROP }); }}><RotateCcw />{t("idPhoto.resetPosition")}</Button>
              <p className="id-photo-note">{t("idPhoto.zoomNote")}</p>
            </> : <>
              <ToggleGroup type="single" value={axis} disabled={locked} aria-label={t("idPhoto.axisLabel")} onValueChange={value => { if (value && value !== axis) changeSetting(() => setAxis(value as "width" | "height")); }}>
                <ToggleGroupItem value="width">{t("idPhoto.axisWidth")}</ToggleGroupItem><ToggleGroupItem value="height">{t("idPhoto.axisHeight")}</ToggleGroupItem>
              </ToggleGroup>
              <label className="id-photo-input-label" htmlFor="id-photo-target">{t("idPhoto.targetLabel", axis === "width" ? t("idPhoto.axisWidthShort") : t("idPhoto.axisHeightShort"))}</label>
              <input className="id-photo-input" id="id-photo-target" inputMode="numeric" value={targetText} aria-invalid={inputInvalid} aria-describedby={inputInvalid ? "id-photo-input-error" : undefined} disabled={locked}
                onChange={event => changeSetting(() => setTargetText(event.target.value))} />
              <p className="id-photo-validation" id="id-photo-input-error">{inputInvalid ? t("err.idPhoto.invalidPixels") : selected && targetStatus(selected)}</p>
              <p className="id-photo-note">{t("idPhoto.customNote")}</p>
            </>}
            <div className="id-photo-action-slot" aria-live="polite">
              {processing ? <Button size="lg" variant="outline" onClick={stop}><LoaderCircle className="spin" />{t("img.stop", progress.current, progress.total)}</Button>
                : <Button size="lg" disabled={importing || inputInvalid || !hasValidTarget} onClick={() => void processAll()}>{importing ? t("idPhoto.importing") : t("img.processAll", assets.length)}</Button>}
              <span>{processing ? t("idPhoto.progressHeld") : Object.keys(effectiveResults).length ? t("idPhoto.resultsReady", Object.keys(effectiveResults).length) : t("idPhoto.outputNote")}</span>
            </div>
            <div className="id-photo-downloads">
              <Button variant="outline" disabled={locked || !selected || !effectiveResults[selected.id]} onClick={() => { if (selected && effectiveResults[selected.id]) downloadPhotos([effectiveResults[selected.id]]); }}><Download />{t("img.downloadCurrent")}</Button>
              <Button variant="outline" disabled={locked || !modeState.actions.canDownload} onClick={() => downloadPhotos(assets.flatMap(asset => effectiveResults[asset.id] ? [effectiveResults[asset.id]] : []))}><Download />{t("img.downloadAll")}</Button>
            </div>
          </Card>
        </div>}
      </section>
      <ToolSeoContent tool="id-photo" /><LicenseFooter />
    </main>
  );
}
