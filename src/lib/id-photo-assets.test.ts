import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptsPhoto, importPhotos, type PhotoAsset } from "./id-photo-assets";

test("顺序导入，混合失败不影响正常图片", async () => {
  const files = ["a.png", "bad.png", "file.txt", "b.webp"].map(name => new File([], name));
  const called: string[] = [];
  const result = await importPhotos(files, () => true, async file => {
    called.push(file.name);
    if (file.name === "bad.png") throw new Error("无法解码");
    return { id: file.name, file } as Omit<PhotoAsset, "sequence">;
  });
  assert.deepEqual(called, ["a.png", "bad.png", "b.webp"]);
  assert.deepEqual(result.loaded.map(a => a.id), ["a.png", "b.webp"]);
  assert.equal(result.failures.length, 2);
  assert.equal(acceptsPhoto({ name: "PHOTO.JPG", type: "" }), true);
});

test("卸载/清空期间导入回调释放已解码对象且不恢复列表", async () => {
  let current = true;
  const released: string[] = [];
  const result = await importPhotos([new File([], "a.png"), new File([], "b.png")], () => current, async file => {
    current = false;
    return { id: file.name, file } as Omit<PhotoAsset, "sequence">;
  }, asset => { released.push((asset as PhotoAsset).id); });
  assert.equal(result.cancelled, true);
  assert.deepEqual(result.loaded, []);
  assert.deepEqual(released, ["a.png"]);
});
