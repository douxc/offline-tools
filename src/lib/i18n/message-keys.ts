/**
 * 界面词条的**键与形状定义**（单一来源）。
 *
 * 三种语言的词条文件都以 `satisfies Messages` 约束，因此：
 *  - 漏掉一个键 = 类型错误（不是运行时才发现）；
 *  - 多写一个键 = 类型错误；
 *  - 带参数的条目用函数，调用点的参数个数与类型由 `MessageDefinition` 决定 ——
 *    插值因此不需要字符串模板解析，也不会因占位符拼错而静默失败。
 *
 * 覆盖范围：**界面文案**。SEO 元数据与正文长文在 `seo-content.ts`；
 * 语言/路由数据在 `locales.ts` / `routes.ts`。
 */

/**
 * 词条目录的形状。新增界面文案时先在这里加一行，三份语言文件会同时报缺。
 */
export type MessageDefinition = {
  // ---- 品牌与站点级 ----
  "brand.name": string;
  "brand.homeLabel": string;
  "header.navLabel": string;
  "header.privacyNote": string;
  "header.themeToDark": string;
  "header.themeToLight": string;
  "header.languageLabel": string;

  // ---- 一级分组 ----
  "group.video": string;
  "group.image": string;

  // ---- 工具名（导航、tab、相关链接共用） ----
  "tool.home": string;
  "tool.video-frame": string;
  "tool.video-compress": string;
  "tool.image-compress": string;
  "tool.image-watermark": string;
  "tool.id-photo": string;
  "tool.image-a4-layout": string;

  // ---- 导航与相关链接 ----
  "tabs.label": (group: string) => string;
  "links.related": string;
  "links.relatedNavLabel": string;

  // ---- 首页 ----
  "home.eyebrow": string;
  "home.titleLine1": string;
  "home.titleLine2": string;
  "home.lead": string;
  "home.openTool": string;
  "home.aboutEyebrow": string;
  "home.toolboxTitle": string;
  "home.toolboxBody": string;
  "home.toolsNavLabel": string;
  "home.heroPrimary": string;
  "home.heroSecondary": string;
  "home.formatsLabel": string;
  "home.mapTitle": string;
  "home.mapLead": string;
  "home.mapInLabel": string;
  "home.mapToolLabel": string;
  "home.mapOutLabel": string;
  "home.mapTabLabel": string;
  "home.mapNote": string;
  "home.mapLine.video-frame": string;
  "home.mapLine.video-compress": string;
  "home.mapLine.image-compress": string;
  "home.mapLine.image-watermark": string;
  "home.mapLine.id-photo": string;
  "home.mapLine.image-a4-layout": string;
  "home.mapIn.video-frame": string;
  "home.mapIn.video-compress": string;
  "home.mapIn.image-compress": string;
  "home.mapIn.image-watermark": string;
  "home.mapIn.id-photo": string;
  "home.mapIn.image-a4-layout": string;
  "home.mapOut.video-frame": string;
  "home.mapOut.video-compress": string;
  "home.mapOut.image-compress": string;
  "home.mapOut.image-watermark": string;
  "home.mapOut.id-photo": string;
  "home.mapOut.image-a4-layout": string;
  "home.proofTitle": string;
  "home.proofLead": string;
  "home.proofBefore": string;
  "home.proofAfter": string;
  "home.proofSaved": string;
  "home.proofCaption": string;
  "home.proofAction": string;
  "home.proofDownload": string;
  "home.proofAlt": string;

  "home.eyebrowVideo": string;
  "home.eyebrowWatermark": string;
  "home.eyebrowImage": string;
  "home.eyebrowPrint": string;
  "home.toolDescription.video-frame": string;
  "home.toolDescription.video-compress": string;
  "home.toolDescription.image-compress": string;
  "home.toolDescription.image-watermark": string;
  "home.toolDescription.id-photo": string;
  "home.toolDescription.image-a4-layout": string;
  "home.detail.videoTitle": string;
  "home.detail.videoBody": string;
  "home.detail.imageTitle": string;
  "home.detail.imageBody": string;
  "home.detail.watermarkTitle": string;
  "home.detail.watermarkBody": string;

  // ---- 文字叠加面板 ----
  "overlay.title": string;
  "overlay.textLabel": string;
  "overlay.textPlaceholder": string;
  "overlay.position": string;
  "overlay.positionTop": string;
  "overlay.positionBottom": string;
  "overlay.size": string;
  "overlay.sizeLabel": string;
  "overlay.textAriaLabel": string;

  // ---- 抽帧采样模式 ----
  "sampling.mode": string;
  "sampling.byInterval": string;
  "sampling.byStep": string;
  "sampling.byCount": string;

  // ---- 页脚 ----
  "footer.license": string;
  "footer.analyticsNote": string;
  "footer.thirdParty": string;
  "footer.source": string;

  // ---- PWA ----
  "pwa.offlineReady": string;
  "pwa.offlineReadyBody": string;
  "pwa.updateReady": string;
  "pwa.updateReadyBody": string;

  // ---- 视频取帧工具 ----
  "vf.eyebrow": string;
  "vf.titleLine1": string;
  "vf.titleLine2": string;
  "vf.leadLine1": string;
  "vf.leadLine2": string;
  "vf.featuresLabel": string;
  "vf.featureQuality": string;
  "vf.featureStep": string;
  "vf.featureOffline": string;
  "vf.dropIdle": string;
  "vf.dropActive": string;
  "vf.dropHint": string;
  "vf.selectVideo": string;
  "vf.formats": string;
  "vf.privacyTitle": string;
  "vf.privacyBody": string;
  "vf.editorLabel": string;
  "vf.previewEyebrow": string;
  "vf.editorTitle": string;
  "vf.previewLabel": string;
  "vf.resolutionReading": string;
  "vf.timelineLabel": string;
  "vf.prevFrame": string;
  "vf.prevFrameTitle": string;
  "vf.pause": string;
  "vf.play": string;
  "vf.playPauseTitle": string;
  "vf.nextFrame": string;
  "vf.nextFrameTitle": string;
  "vf.fps": string;
  "vf.panelCurrent": string;
  "vf.timecodeHint": string;
  "vf.format": string;
  "vf.formatLabel": string;
  "vf.quality": string;
  "vf.qualityLabel": string;
  "vf.batch": string;
  "vf.batchOn": string;
  "vf.batchOff": string;
  "vf.interval": string;
  "vf.intervalAria": string;
  "vf.step": string;
  "vf.stepAria": string;
  "vf.count": string;
  "vf.countAria": string;
  "vf.stopExport": (current: number, total: number) => string;
  "vf.exported": string;
  "vf.exportBatch": string;
  "vf.generating": string;
  "vf.exportFrame": string;
  "vf.exportNoteBatch": string;
  "vf.exportNoteSingle": string;
  "vf.shortcutFrame": string;
  "vf.shortcutSpace": string;
  "vf.shortcutPlay": string;
  "vf.resetTitle": string;
  "vf.resetDescription": string;
  "vf.resetConfirm": string;
  "vf.resetTrigger": string;
  "vf.errPickVideo": string;
  "vf.errPickVideoBody": string;
  "vf.errCanvas": string;
  "vf.errEncode": string;
  "vf.errExportFailed": string;
  "vf.errExportFailedBody": string;
  "vf.errBatchFailed": string;
  "vf.errBatchFailedBody": string;
  "vf.cancelled": string;
  "vf.cancelledBody": string;
  "vf.batchExported": (count: number) => string;
  "vf.batchExportedBody": string;
  "vf.errPlayback": string;

  // ---- 视频压缩工具 ----
  "vc.previewLabel": string;
  "vc.eyebrow": string;
  "vc.titleLine1": string;
  "vc.titleLine2": string;
  "vc.leadLine1": string;
  "vc.leadLine2": string;
  "vc.featureRowLabel": string;
  "vc.featureBitrate": string;
  "vc.featureScale": string;
  "vc.featureOffline": string;
  "vc.dropIdle": string;
  "vc.dropActive": string;
  "vc.dropHint": string;
  "vc.selectVideo": string;
  "vc.dropNote": string;
  "vc.privacyTitle": string;
  "vc.privacyBody": string;
  "vc.editorLabel": string;
  "vc.previewEyebrow": string;
  "vc.editorTitle": string;
  "vc.optionsTitle": string;
  "vc.bitrate": string;
  "vc.bitrateLow": string;
  "vc.bitrateMedium": string;
  "vc.bitrateHigh": string;
  "vc.targetWidth": string;
  "vc.targetWidthLabel": string;
  "vc.stop": string;
  "vc.start": string;
  "vc.progress": string;
  "vc.exported": (size: string) => string;
  "vc.reduced": (percent: number) => string;
  "vc.increased": (percent: number) => string;
  "vc.exportNote": string;
  "vc.resetTitle": string;
  "vc.resetDescription": string;
  "vc.resetConfirm": string;
  "vc.resetTrigger": string;
  "vc.errPickVideo": string;
  "vc.errPickVideoBody": string;
  "vc.cancelled": string;
  "vc.cancelledBody": string;
  "vc.errNoRecorder": string;
  "vc.errNoRecorderBody": string;
  "vc.errNoWebm": string;
  "vc.errNoWebmBody": string;
  "vc.errCanvas": string;
  "vc.errCapture": string;
  "vc.errRecorder": string;
  "vc.done": string;
  "vc.doneBody": (size: string) => string;
  "vc.errPlayback": string;
  "vc.errPlaybackBody": string;

  // ---- A4 排版工具 ----
  "a4.pageLabel": (n: number) => string;
  "a4.itemIndex": (n: string) => string;
  "a4.moveUp": (name: string) => string;
  "a4.moveDown": (name: string) => string;
  "a4.remove": (name: string) => string;
  "a4.prevPage": string;
  "a4.pageOf": (current: number, total: number) => string;
  "a4.nextPage": string;
  "a4.colsPerRow": string;
  "a4.colsOptionLabel": (cols: number) => string;
  "a4.colsOptionText": (cols: number) => string;
  "a4.decodeFailed": (count: number) => string;
  "a4.decodeFailedOne": (name: string) => string;
  "a4.printDisabledTitle": string;
  "a4.print": (pages: number) => string;
  "a4.clearTitle": string;
  "a4.clearDescription": (count: number) => string;
  "a4.clearConfirm": string;
  "a4.clearTrigger": string;
  "a4.emptyTitle": string;
  "a4.emptyHint": string;
  "a4.selectImages": string;
  "a4.emptyNote": string;
  "a4.listTitle": string;
  "a4.itemCount": (count: number) => string;
  "a4.add": string;
  "a4.previewTitle": string;
  "a4.previewMeta": (margin: number, cols: number, rows: number) => string;
  "a4.settingsTitle": string;
  "a4.colsLabel": string;
  "a4.colsHint": string;
  "a4.margin": string;

  "idPhoto.importFailed": (count: number) => string;
  "idPhoto.processPartial": (done: number, failed: number) => string;
  "idPhoto.processPartialBody": (details: string) => string;
  "idPhoto.processDone": (count: number) => string;
  "idPhoto.stopped": string;
  "idPhoto.stoppedBody": string;

  "idPhoto.clearTitle": string;
  "idPhoto.clearDescription": (count: number) => string;
  "idPhoto.clearTrigger": string;
  "idPhoto.editorLabel": string;
  "idPhoto.title": string;
  "idPhoto.lead": string;
  "idPhoto.emptyTitle": string;
  "idPhoto.emptyHint": string;
  "idPhoto.importing": string;
  "idPhoto.selectImages": string;
  "idPhoto.listTitle": (count: number) => string;
  "idPhoto.append": string;
  "idPhoto.doneSuffix": string;
  "idPhoto.remove": (name: string) => string;
  "idPhoto.previewCrop": string;
  "idPhoto.previewFull": string;
  "idPhoto.cropHelp": string;
  "idPhoto.fullHelp": string;
  "idPhoto.settingsTitle": string;
  "idPhoto.modeLabel": string;
  "idPhoto.modeFixed": string;
  "idPhoto.modeCustom": string;
  "idPhoto.presetLabel": string;
  "idPhoto.ppiNote": (widthMm: number, heightMm: number) => string;
  "idPhoto.zoom": string;
  "idPhoto.resetPosition": string;
  "idPhoto.zoomNote": string;
  "idPhoto.axisLabel": string;
  "idPhoto.axisWidthShort": string;
  "idPhoto.axisWidth": string;
  "idPhoto.axisHeightShort": string;
  "idPhoto.axisHeight": string;
  "idPhoto.targetLabel": (axis: string) => string;
  "idPhoto.customNote": string;
  "idPhoto.progressHeld": string;
  "idPhoto.resultsReady": (count: number) => string;
  "idPhoto.outputNote": string;

  // ---- 图片工具（压缩 / 水印） ----
  "img.errEncode": string;
  "img.errTooManyPixels": string;
  "img.errDecode": string;
  "img.errCanvas": string;
  "img.badgeQuantised": string;
  "img.badgeLossless": string;
  "img.badgeAlreadyOptimal": string;
  "img.badgeSample": string;
  "img.badgeWebpAuto": string;
  "img.badgeJpegAuto": string;
  "img.badgeOriginalSizeWatermark": string;
  "img.errPickImages": string;
  "img.importFailed": (count: number) => string;
  "img.errProcessing": string;
  "img.errUnknown": string;
  "img.cancelled": string;
  "img.cancelledBody": (remaining: number) => string;
  "img.done": (count: number) => string;
  "img.partial": (done: number, failed: number) => string;
  "img.partialBody": string;
  "img.clearTitle": string;
  "img.clearDescription": (count: number) => string;
  "img.clearConfirm": string;
  "img.clearTrigger": string;
  "img.eyebrow": string;
  "img.titleCompress": string;
  "img.titleWatermark": string;
  "img.leadCompress": string;
  "img.leadWatermark": string;
  "img.dropIdle": string;
  "img.dropHint": string;
  "img.selectImages": string;
  "img.acceptedFormats": string;
  "img.listTitle": string;
  "img.itemCount": (count: number) => string;
  "img.add": string;
  "img.remove": string;
  "img.previewOriginal": string;
  "img.previewWatermark": string;
  "img.noneSelected": string;
  "img.previewLabel": string;
  "img.processing": string;
  "img.compressSettings": string;
  "img.watermarkText": string;
  "img.watermarkTextLabel": string;
  "img.compressQuality": string;
  "img.outputQuality": string;
  "img.fontSize": string;
  "img.watermarkStrength": string;
  "img.angle": string;
  "img.compressNote": string;
  "img.watermarkNote": string;
  "img.stop": (current: number, total: number) => string;
  "img.processAll": (count: number) => string;
  "img.doneCount": (count: number) => string;
  "img.retryCount": (count: number) => string;
  "img.savedBytes": (size: string) => string;
  "img.outputBytes": (size: string) => string;
  "img.downloadAll": string;
  "img.downloadCurrent": string;

  // ---- 底层错误消息与预设名（纯函数/worker 抛错误码，由调用方翻译） ----
  "err.idPhoto.invalidPixels": string;
  "err.idPhoto.cannotUpscale": string;
  "err.idPhoto.canvasFailed": string;
  "err.idPhoto.encodeFailed": string;
  "err.idPhoto.unsupportedOutputFormat": string;
  "err.idPhoto.decodeFailed": string;
  "err.idPhoto.invalidDimensions": string;
  "err.idPhoto.tooManyPixels": string;
  "err.idPhoto.notAcceptedFormat": string;
  "err.png.loadFailed": string;
  "err.png.timeout": string;
  "err.png.cancelled": string;
  "err.png.invalidPng": string;
  "err.png.compressFailed": string;
  "idPhotoPreset.oneInch": string;
  "idPhotoPreset.twoInch": string;

  // ---- 证件照 ----
  "idPhoto.cropPreviewLabel": string;

  // ---- 通用操作 ----
  "common.confirm": string;
  "common.cancel": string;
};

/** 某种语言的完整词条表。 */
export type Messages = {
  [Key in keyof MessageDefinition]: MessageDefinition[Key] extends (
    ...args: infer Args
  ) => string
    ? (...args: Args) => string
    : string;
};

export type MessageKey = keyof MessageDefinition;
