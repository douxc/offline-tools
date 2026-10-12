export const ID_PHOTO_PPI = 300;
/**
 * 尺寸预设：这里只放**与语言无关**的物理/像素尺寸。
 * 显示名（一寸 / 二寸）在词条里（`idPhotoPreset.*`），新增语言不需要改本文件。
 */
export const ID_PHOTO_PRESETS = [
  { id: "one-inch", widthMm: 25, heightMm: 35, width: 295, height: 413 },
  { id: "two-inch", widthMm: 35, heightMm: 49, width: 413, height: 579 },
] as const;

/** 预设 id -> 词条键，供界面取显示名。 */
export const ID_PHOTO_PRESET_LABEL_KEY = {
  "one-inch": "idPhotoPreset.oneInch",
  "two-inch": "idPhotoPreset.twoInch",
} as const satisfies Record<(typeof ID_PHOTO_PRESETS)[number]["id"], string>;
export type IdPhotoPresetId = (typeof ID_PHOTO_PRESETS)[number]["id"];
export const DEFAULT_ID_PHOTO_PRESET = ID_PHOTO_PRESETS[0];
