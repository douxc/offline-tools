/**
 * 入口页与 SEO 的**纯内容数据**（按「语言 × 工具」组织）。
 *
 * 本模块刻意不 import React、不触碰浏览器全局：`vite.config.ts` 在构建期
 * 用它渲染 21 个入口页的完整 HTML，`src/lib/seo.ts` 在运行期用它更新文档头。
 * 两处消费同一份数据，因此静态 HTML 与客户端 SEO 不可能再漂移 —— 这正是
 * 改造前 7 个手写入口页与 `SEO_PAGES` 逐字重复、只能靠测试防漂移的问题所在。
 *
 * 不随语言变化的字段（viewport、robots、OG 图片尺寸、价格币种、操作系统、
 * 工具路由）集中在下方常量里，避免在三种语言里各写一遍。
 */
import { LOCALES, type LocaleCode } from "./locales";
import { toolPathInLocale } from "./routes";
import type { ToolRoute } from "./tool-routes";

/** viewport / robots 等与语言无关的 `<meta>` 取值。 */
export const SITE_META = {
  viewport: "width=device-width, initial-scale=1.0",
  themeColor: "#000000",
  robots:
    "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  ogImageWidth: "1200",
  ogImageHeight: "630",
  ogImagePath: "/og.png",
  offerPrice: "0",
  offerPriceCurrency: "CNY",
  operatingSystem: "Windows, macOS, Linux, Android, iOS",
  browserRequirements: "Requires JavaScript and an HTML5-compatible browser",
  applicationSubCategory: "Browser-based utility",
} as const;

/** 全部工具路由，顺序即首页 ItemList 与结构化数据的顺序。 */
export const ALL_TOOL_ROUTES: readonly ToolRoute[] = [
  "home",
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "id-photo",
  "image-a4-layout",
];

/** 可作为「相关工具 / 首页列表」列出的工具（不含首页）。 */
export const LISTED_TOOL_ROUTES: readonly ToolRoute[] = ALL_TOOL_ROUTES.filter(
  (route) => route !== "home",
);

/** 单个工具在**一种语言**下的全部入口页文案。 */
export type ToolSeoContent = {
  /** `<title>` 与 `og:title`。 */
  title: string;
  /** `<meta name="description">`。 */
  description: string;
  /** `<meta name="keywords">`（逗号分隔）。 */
  keywords: string;
  /** `<meta name="application-name">` / `og:site_name`。 */
  applicationName: string;
  /** `og:description`（可与 description 不同，社交卡片更短）。 */
  ogDescription: string;
  /** `og:image:alt` 与 `twitter:image:alt`。 */
  ogImageAlt: string;
  /** `twitter:title`。 */
  twitterTitle: string;
  /** `twitter:description`。 */
  twitterDescription: string;
  /** WebApplication JSON-LD 的 `name`。 */
  applicationNameJsonLd: string;
  /** WebApplication JSON-LD 的 `description`。 */
  jsonLdDescription: string;
  /** `featureList`。 */
  features: readonly string[];
  /** `applicationCategory`，如 MultimediaApplication。 */
  category: string;
  /** `<noscript>` 的 `<h1>`。 */
  noscriptTitle: string;
  /** `<noscript>` 的段落。 */
  noscriptBody: string;
  /** `<noscript>` 返回首页的链接文字（工具页用，指向本站首页）。 */
  noscriptHomeLabel: string;
  /** 面包屑第一级（首页）的名称。 */
  breadcrumbHomeName: string;
  /**
   * 首页 `<noscript>` 导航的工具名（键为路由）。工具名比 TOOL_LABELS 更长，
   * 且只出现在首页，因此仅首页提供；缺失时回退到该工具的 applicationNameJsonLd。
   */
  noscriptNavLabels?: Partial<Record<ToolRoute, string>>;
};

export type LocaleSeoContent = Record<ToolRoute, ToolSeoContent>;

/** 单个工具在三种语言下的内容集合。 */
export type MultilingualSeoContent = Record<LocaleCode, LocaleSeoContent>;

/** 取某语言某工具的文案。 */
export const seoContentFor = (
  locale: LocaleCode,
  route: ToolRoute,
): ToolSeoContent => SEO_CONTENT[locale][route];

/** 取某语言某工具的规范路径（委托给 routes.ts，保持单一实现）。 */
export const seoPathFor = (locale: LocaleCode, route: ToolRoute): string =>
  toolPathInLocale(locale, route);

/** 首页在每种语言下的列表条目（名称 + 规范路径）。 */
export const toolListFor = (
  locale: LocaleCode,
): ReadonlyArray<{ route: ToolRoute; name: string; path: string }> =>
  LISTED_TOOL_ROUTES.map((route) => ({
    route,
    name: SEO_CONTENT[locale][route].applicationNameJsonLd,
    path: seoPathFor(locale, route),
  }));

/** 该语言下的权威语言标签，供 `<html lang>`、`hreflang`、`inLanguage` 共用。 */
export const languageTagFor = (locale: LocaleCode): string =>
  LOCALES[locale].htmlLang;

export const SEO_CONTENT: MultilingualSeoContent = {
  en: {
    home: {
      title: "Offline Tools | Frame extraction, image compression and watermarking",
      description:
        "Free browser-based offline tools: extract video frames, compress PNG/JPG/WebP images and add text watermarks in bulk. Files are processed on your device and never uploaded.",
      keywords:
        "offline tools,browser tools,video frame extraction,video screenshot,image compression,image watermark,batch image processing,local processing",
      applicationName: "Offline Tools",
      ogDescription:
        "Extract frames, compress images and add watermarks without uploading anything.",
      ogImageAlt: "Offline Tools: frame extraction, image compression and watermarking",
      twitterTitle: "Offline Tools | Video frames, image compression, watermarking",
      twitterDescription:
        "Process video and images locally in your browser. Nothing is uploaded.",
      applicationNameJsonLd: "Offline Tools",
      jsonLdDescription:
        "A collection of frame extraction, image compression and watermarking tools that need no uploads.",
      features: [],
      category: "UtilitiesApplication",
      noscriptTitle: "Offline Tools",
      noscriptBody:
        "Video and images are processed locally in your browser and are never uploaded.",
      noscriptNavLabels: {
        "video-frame": "Extract video frames",
        "video-compress": "Compress video",
        "image-compress": "Compress images",
        "image-watermark": "Add image watermark",
        "id-photo": "ID photo",
        "image-a4-layout": "A4 image layout",
      },
      noscriptHomeLabel: "Back to home",
      breadcrumbHomeName: "Offline Tools",
    },
    "video-frame": {
      title: "Video Frame Extractor | Step through frames and export images",
      description:
        "Free online video frame extractor. Step through MP4, WebM and MOV videos frame by frame and export PNG, JPG or WebP at the original resolution. Nothing is uploaded.",
      keywords:
        "video frame extraction,video screenshot,video to image,extract frames,frame by frame,MP4 screenshot,export video frame",
      applicationName: "Offline Tools",
      ogDescription:
        "Step through video frame by frame and export PNG, JPG or WebP at original resolution.",
      ogImageAlt: "Online video frame extractor",
      twitterTitle: "Video Frame Extractor",
      twitterDescription:
        "No upload needed. Step through frames and export images at original resolution.",
      applicationNameJsonLd: "Video Frame Extractor",
      jsonLdDescription:
        "Step through video frame by frame in your browser and export PNG, JPG or WebP at the original resolution.",
      features: [
        "Step forward and backward one frame",
        "Export at original resolution",
        "Supports PNG, JPG and WebP",
        "Video is processed locally in your browser",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "Video Frame Extractor",
      noscriptBody:
        "Step through video frames and export images at the original resolution; your video is never uploaded.",
      noscriptHomeLabel: "Back to Offline Tools home",
      breadcrumbHomeName: "Offline Tools",
    },
    "video-compress": {
      title: "Online Video Compressor | Compress to WebM in your browser",
      description:
        "Free online video compressor. Re-encode video to WebM in your browser with a controllable bitrate and proportional scaling, keeping the original audio track. Nothing is uploaded.",
      keywords:
        "video compression,compress video online,video compressor,WebM compression,reduce video size,browser video compression",
      applicationName: "Offline Tools",
      ogDescription:
        "Re-encode video to WebM locally with a controllable bitrate and proportional scaling.",
      ogImageAlt: "Online video compressor",
      twitterTitle: "Online Video Compressor",
      twitterDescription:
        "Compress video to WebM in your browser. Nothing is uploaded.",
      applicationNameJsonLd: "Online Video Compressor",
      jsonLdDescription:
        "Re-encode video to WebM locally in your browser with a controllable bitrate and proportional scaling, keeping the original audio track.",
      features: [
        "Compress with a controllable bitrate",
        "Scale video dimensions proportionally",
        "Keep the original audio track",
        "Video is processed locally in your browser",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "Online Video Compressor",
      noscriptBody:
        "Compress video locally in your browser without uploading it.",
      noscriptHomeLabel: "Back to Offline Tools home",
      breadcrumbHomeName: "Offline Tools",
    },
    "image-compress": {
      title: "Image Compressor | Batch compress PNG, JPG and WebP",
      description:
        "Free online image compressor. Batch compress PNG, JPG and WebP. PNG picks colour quantisation or lossless optimisation automatically. Images are never uploaded.",
      keywords:
        "image compression,compress images online,batch image compression,PNG compression,JPG compression,WebP compression,reduce image size",
      applicationName: "Offline Tools",
      ogDescription:
        "Batch compress PNG, JPG and WebP locally, choosing the right strategy automatically.",
      ogImageAlt: "Online image compressor",
      twitterTitle: "Image Compressor",
      twitterDescription:
        "Batch compress PNG, JPG and WebP in your browser. Nothing is uploaded.",
      applicationNameJsonLd: "Image Compressor",
      jsonLdDescription:
        "Batch compress PNG, JPG and WebP images locally in your browser, choosing a suitable strategy automatically.",
      features: [
        "Batch compress PNG, JPG and WebP",
        "Adaptive quantisation or lossless optimisation for PNG",
        "Never produces a file larger than the original",
        "Images are processed locally in your browser",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "Image Compressor",
      noscriptBody:
        "Compress images locally in your browser without uploading them.",
      noscriptHomeLabel: "Back to Offline Tools home",
      breadcrumbHomeName: "Offline Tools",
    },
    "image-watermark": {
      title: "Image Watermark Tool | Add text watermarks in bulk",
      description:
        "Free image watermark tool. Add text watermarks in bulk and adjust the text, size, opacity and angle. Keeps the original size, format and PNG transparency. Nothing is uploaded.",
      keywords:
        "image watermark,add watermark online,batch watermark,text watermark,photo watermark,PNG watermark,JPG watermark",
      applicationName: "Offline Tools",
      ogDescription:
        "Add adjustable text watermarks to PNG, JPG and WebP images in bulk, locally.",
      ogImageAlt: "Image watermark tool",
      twitterTitle: "Image Watermark Tool",
      twitterDescription:
        "Add text watermarks in bulk in your browser. Nothing is uploaded.",
      applicationNameJsonLd: "Image Watermark Tool",
      jsonLdDescription:
        "Add adjustable text watermarks to PNG, JPG and WebP images in bulk, locally in your browser.",
      features: [
        "Add text watermarks in bulk",
        "Adjust size, opacity and angle",
        "Keep the original size and format",
        "Preserve PNG transparency",
      ],
      category: "DesignApplication",
      noscriptTitle: "Image Watermark Tool",
      noscriptBody:
        "Add text watermarks to your images locally; they are never uploaded.",
      noscriptHomeLabel: "Back to Offline Tools home",
      breadcrumbHomeName: "Offline Tools",
    },
    "id-photo": {
      title: "ID Photo | Crop to 1-inch and 2-inch sizes",
      description:
        "Process ID photos locally in your browser: scale and crop to one-inch or two-inch sizes, or shrink an image by a custom width or height. Supports PNG, JPG and WebP in bulk.",
      keywords:
        "id photo,passport photo,one inch photo,two inch photo,id photo size,photo crop,local processing",
      applicationName: "Offline Tools",
      ogDescription:
        "Crop to one-inch or two-inch ID photo sizes, or shrink by a custom size, locally.",
      ogImageAlt: "ID photo cropping tool",
      twitterTitle: "ID Photo",
      twitterDescription:
        "Crop and scale ID photos in your browser. Nothing is uploaded.",
      applicationNameJsonLd: "ID Photo",
      jsonLdDescription:
        "Crop and position one-inch and two-inch ID photos, or scale down by a custom size, locally in your browser.",
      features: [
        "One-inch and two-inch presets",
        "Drag to position and crop proportionally",
        "Custom proportional downscaling",
        "PNG, JPG and WebP processed locally",
      ],
      category: "DesignApplication",
      noscriptTitle: "ID Photo",
      noscriptBody:
        "Crop ID photos to the size you need; images are never uploaded.",
      noscriptHomeLabel: "Back to Offline Tools home",
      breadcrumbHomeName: "Offline Tools",
    },
    "image-a4-layout": {
      title: "A4 Image Layout | Print photos in bulk on A4 paper",
      description:
        "Free A4 image layout tool. Flow local images onto A4 pages with 1-6 per row, with row heights adapting to each image's aspect ratio, and print straight from the browser. Nothing is uploaded.",
      keywords:
        "image layout,print layout,A4 layout,photo printing,batch photo print,row layout,image print,id photo layout",
      applicationName: "Offline Tools",
      ogDescription:
        "Flow images onto A4 pages by images-per-row, with automatic row heights and pagination.",
      ogImageAlt: "A4 image layout and printing tool",
      twitterTitle: "A4 Image Layout",
      twitterDescription:
        "Lay images out on A4 pages and print from your browser. Nothing is uploaded.",
      applicationNameJsonLd: "A4 Image Layout",
      jsonLdDescription:
        "Flow images onto A4 pages by images-per-row in your browser, with automatic row heights, adjustable margins, pagination and printing.",
      features: [
        "1-6 images per row",
        "Flow layout by each image's aspect ratio",
        "Adjustable A4 margins and automatic pagination",
        "Keeps image proportions without cropping",
        "Print the A4 layout from the browser dialog",
        "Images are processed locally in your browser",
      ],
      category: "DesignApplication",
      noscriptTitle: "A4 Image Layout",
      noscriptBody:
        "Lay your images out on A4 pages for printing; they are never uploaded.",
      noscriptHomeLabel: "Back to Offline Tools home",
      breadcrumbHomeName: "Offline Tools",
    },
  },
  "zh-CN": {
    home: {
      title: "离线工具箱｜在线视频取帧、图片压缩与图片加水印",
      description:
        "免费浏览器离线工具箱：在线完成视频取帧、视频截图、PNG/JPG/WebP 图片压缩和批量图片加水印。文件只在本机处理，无需上传或注册。",
      keywords:
        "离线工具,在线工具箱,浏览器工具,视频取帧,视频截图,图片压缩,图片加水印,批量图片处理,本地处理",
      applicationName: "离线工具",
      ogDescription:
        "免费浏览器离线工具箱：视频取帧、图片压缩和批量图片加水印，文件无需上传。",
      ogImageAlt: "离线工具箱：视频取帧、图片压缩与图片加水印",
      twitterTitle: "离线工具箱｜在线视频取帧、图片压缩与图片加水印",
      twitterDescription:
        "视频和图片无需上传，直接在浏览器本地完成取帧、压缩与水印。",
      applicationNameJsonLd: "离线工具",
      jsonLdDescription:
        "无需上传文件的在线视频取帧、图片压缩与图片加水印工具集合。",
      features: [],
      category: "UtilitiesApplication",
      noscriptTitle: "离线工具",
      noscriptBody: "视频与图片只在浏览器本地处理，不会上传。",
      noscriptNavLabels: {
        "video-frame": "视频取帧",
        "video-compress": "视频压缩",
        "image-compress": "图片压缩",
        "image-watermark": "图片添加水印",
        "id-photo": "证件照",
        "image-a4-layout": "图片 A4 排版打印",
      },
      noscriptHomeLabel: "返回离线工具首页",
      breadcrumbHomeName: "离线工具",
    },
    "video-frame": {
      title: "视频取帧工具｜在线逐帧截图、视频转图片 - 离线工具",
      description:
        "免费在线视频取帧工具，支持逐帧定位 MP4、WebM、MOV 等视频画面，按原始分辨率导出 PNG、JPG 或 WebP。视频不上传，浏览器本地处理。",
      keywords:
        "视频取帧,视频截图,视频转图片,在线截帧,逐帧截图,提取视频帧,MP4截图,视频帧导出",
      applicationName: "离线工具",
      ogDescription:
        "逐帧定位视频画面，按原始分辨率导出 PNG、JPG 或 WebP；视频不上传。",
      ogImageAlt: "在线视频取帧与逐帧截图工具",
      twitterTitle: "视频取帧工具｜在线逐帧截图、视频转图片",
      twitterDescription: "视频无需上传，逐帧定位并按原始分辨率导出图片。",
      applicationNameJsonLd: "视频取帧工具",
      jsonLdDescription:
        "在浏览器本地逐帧定位视频画面，并按原始分辨率导出 PNG、JPG 或 WebP 图片。",
      features: [
        "逐帧前进与后退",
        "按原始分辨率导出",
        "支持 PNG、JPG 与 WebP",
        "视频仅在浏览器本地处理",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "视频取帧",
      noscriptBody:
        "逐帧定位视频画面，并按原始分辨率导出图片；视频不会上传。",
      noscriptHomeLabel: "返回离线工具首页",
      breadcrumbHomeName: "离线工具",
    },
    "video-compress": {
      title: "在线视频压缩工具｜浏览器本地压缩导出 WebM - 离线工具",
      description:
        "免费在线视频压缩工具，在浏览器中重新编码视频为 WebM，可控码率与等比缩放尺寸，保留原音轨。视频不上传，本地完成压缩导出。",
      keywords:
        "视频压缩,在线视频压缩,视频压缩导出,WebM压缩,视频减小体积,浏览器压缩视频,本地视频处理",
      applicationName: "离线工具",
      ogDescription:
        "可控码率与等比缩放，保留原音轨；视频不上传，浏览器本地完成压缩。",
      ogImageAlt: "在线视频压缩与导出工具",
      twitterTitle: "在线视频压缩工具｜浏览器本地压缩导出 WebM",
      twitterDescription:
        "视频无需上传，在浏览器本地重新编码并导出 WebM。",
      applicationNameJsonLd: "在线视频压缩工具",
      jsonLdDescription:
        "在浏览器本地通过重新编码把视频导出为 WebM，可控码率与等比缩放，保留原音轨。",
      features: [
        "可控码率压缩导出",
        "等比缩放视频尺寸",
        "保留原音轨",
        "视频仅在浏览器本地处理",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "视频压缩",
      noscriptBody:
        "在浏览器本地重新编码视频并导出 WebM，视频不会上传。",
      noscriptHomeLabel: "返回离线工具首页",
      breadcrumbHomeName: "离线工具",
    },
    "image-compress": {
      title: "在线图片压缩工具｜批量压缩 PNG、JPG、WebP - 离线工具",
      description:
        "免费在线图片压缩工具，批量压缩 PNG、JPG 和 WebP。PNG 自动选择颜色量化或无损优化，图片不上传，直接在浏览器本地减小文件体积。",
      keywords:
        "图片压缩,在线图片压缩,批量图片压缩,PNG压缩,JPG压缩,JPEG压缩,WebP压缩,无损图片压缩,减小图片体积",
      applicationName: "离线工具",
      ogDescription:
        "批量减小 PNG、JPG 与 WebP 图片体积，文件不上传，浏览器本地完成压缩。",
      ogImageAlt: "PNG、JPG 与 WebP 在线图片压缩工具",
      twitterTitle: "在线图片压缩工具｜批量压缩 PNG、JPG、WebP",
      twitterDescription: "图片无需上传，直接在浏览器本地批量减小文件体积。",
      applicationNameJsonLd: "在线图片压缩工具",
      jsonLdDescription:
        "在浏览器本地批量压缩 PNG、JPG 与 WebP 图片，自动选择合适的压缩策略。",
      features: [
        "批量压缩 PNG、JPG 与 WebP",
        "PNG 自适应量化或无损优化",
        "避免生成比原图更大的文件",
        "图片仅在浏览器本地处理",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "图片压缩",
      noscriptBody:
        "使用 libimagequant、OxiPNG 与浏览器编码器压缩图片，文件不会上传。",
      noscriptHomeLabel: "返回离线工具首页",
      breadcrumbHomeName: "离线工具",
    },
    "image-watermark": {
      title: "图片加水印工具｜在线批量添加文字水印 - 离线工具",
      description:
        "免费图片加水印工具，在线批量添加文字水印，可调整文字内容、大小、透明度和角度。保持原始尺寸、格式及 PNG 透明背景，图片不上传。",
      keywords:
        "图片加水印,在线加水印,批量加水印,文字水印,照片加水印,PNG加水印,JPG加水印,WebP加水印",
      applicationName: "离线工具",
      ogDescription:
        "批量添加可调节的文字水印，保持原始尺寸、格式及 PNG 透明背景，图片不上传。",
      ogImageAlt: "在线批量图片加文字水印工具",
      twitterTitle: "图片加水印工具｜在线批量添加文字水印",
      twitterDescription: "图片无需上传，在线批量添加可调节的文字水印。",
      applicationNameJsonLd: "图片加水印工具",
      jsonLdDescription:
        "在浏览器本地为 PNG、JPG 与 WebP 图片批量添加可调节的文字水印。",
      features: [
        "批量添加文字水印",
        "调整文字大小、透明度与角度",
        "保持图片原始尺寸和格式",
        "保留 PNG 透明通道",
      ],
      category: "DesignApplication",
      noscriptTitle: "图片添加水印",
      noscriptBody:
        "批量添加文字水印，保持原始尺寸和图片格式；文件不会上传。",
      noscriptHomeLabel: "返回离线工具首页",
      breadcrumbHomeName: "离线工具",
    },
    "id-photo": {
      title: "证件照｜一寸二寸裁切与自定义等比缩放 - 离线工具",
      description:
        "浏览器本地证件照尺寸处理：一寸、二寸照片等比缩放与拖动定位裁切，自定义宽度或高度缩小完整图片，支持批量 PNG、JPG、WebP，无需上传。",
      keywords: "证件照,一寸照片,二寸照片,证件照尺寸,照片裁切,等比缩放,本地处理",
      applicationName: "离线工具",
      ogDescription:
        "一寸二寸定位裁切与自定义等比缩小，图片在浏览器本地处理。",
      ogImageAlt: "证件照尺寸处理工具",
      twitterTitle: "证件照｜一寸二寸裁切与自定义等比缩放",
      twitterDescription: "无需上传，完成证件照尺寸处理和等比缩小。",
      applicationNameJsonLd: "证件照",
      jsonLdDescription:
        "一寸二寸定位裁切与自定义等比缩小，图片在浏览器本地处理。",
      features: [
        "一寸二寸尺寸预设",
        "拖动定位与等比裁切",
        "自定义等比缩小",
        "PNG、JPG、WebP 本地处理",
      ],
      category: "DesignApplication",
      noscriptTitle: "证件照",
      noscriptBody:
        "选择一寸、二寸预设定位裁切，或自定义尺寸等比缩小；文件不会上传。",
      noscriptHomeLabel: "返回离线工具首页",
      breadcrumbHomeName: "离线工具",
    },
    "image-a4-layout": {
      title: "图片 A4 排版打印工具｜批量排版照片打印 - 离线工具",
      description:
        "免费图片 A4 排版打印工具：把本地图片按每行 1–6 张流动排列到 A4 纸上，只设横向张数，行高按图片实际宽高比自动适配，直接调用浏览器打印。图片不上传。",
      keywords:
        "图片排版,打印排版,A4排版,照片排版打印,批量图片打印,按行排版,图片打印,证件照排版",
      applicationName: "离线工具",
      ogDescription:
        "本地图片按每行张数流动排到 A4 纸，页边距与分页可调，直接调用浏览器打印，图片不上传。",
      ogImageAlt: "图片 A4 排版打印工具",
      twitterTitle: "图片 A4 排版打印工具｜批量排版照片打印",
      twitterDescription: "图片无需上传，在浏览器里把照片按每行张数排到 A4 纸并直接打印。",
      applicationNameJsonLd: "图片 A4 排版打印工具",
      jsonLdDescription:
        "在浏览器本地把图片按每行张数流动排列到 A4 页面，行高按图片实际宽高比自适应，可调页边距、自动分页并调用浏览器打印。",
      features: [
        "每行 1–6 张自由设置",
        "按图片实际宽高比流动排版",
        "可调 A4 页边距与自动分页",
        "保持图片比例、不裁切",
        "打印对话框输出 A4 版面",
        "图片仅在浏览器本地处理",
      ],
      category: "DesignApplication",
      noscriptTitle: "图片 A4 排版打印",
      noscriptBody:
        "把本地图片按每行张数流动排到 A4 纸上直接调用浏览器打印；文件不会上传。",
      noscriptHomeLabel: "返回离线工具首页",
      breadcrumbHomeName: "离线工具",
    },
  },
  ja: {
    home: {
      title: "オフラインツール｜動画フレーム抽出・画像圧縮・ウォーターマーク",
      description:
        "無料のブラウザ完結型オフラインツール。動画のフレーム抽出、PNG/JPG/WebP の画像圧縮、テキストウォーターマークの一括追加ができます。ファイルは端末内で処理され、アップロードされません。",
      keywords:
        "オフラインツール,ブラウザツール,動画フレーム抽出,動画スクリーンショット,画像圧縮,画像ウォーターマーク,画像一括処理,ローカル処理",
      applicationName: "オフラインツール",
      ogDescription:
        "アップロード不要で、フレーム抽出・画像圧縮・ウォーターマークをブラウザ内で完結。",
      ogImageAlt: "オフラインツール：フレーム抽出・画像圧縮・ウォーターマーク",
      twitterTitle: "オフラインツール｜動画フレーム抽出と画像処理",
      twitterDescription:
        "動画も画像もアップロードせず、ブラウザ内だけで処理します。",
      applicationNameJsonLd: "オフラインツール",
      jsonLdDescription:
        "アップロード不要で使える、動画フレーム抽出・画像圧縮・ウォーターマークのツール集。",
      features: [],
      category: "UtilitiesApplication",
      noscriptTitle: "オフラインツール",
      noscriptBody:
        "動画と画像はブラウザ内だけで処理され、アップロードされません。",
      noscriptNavLabels: {
        "video-frame": "動画フレーム抽出",
        "video-compress": "動画圧縮",
        "image-compress": "画像圧縮",
        "image-watermark": "画像ウォーターマーク",
        "id-photo": "証明写真",
        "image-a4-layout": "A4 画像レイアウト",
      },
      noscriptHomeLabel: "オフラインツールのホームへ戻る",
      breadcrumbHomeName: "オフラインツール",
    },
    "video-frame": {
      title: "動画フレーム抽出｜コマ送りで画像を書き出す - オフラインツール",
      description:
        "無料の動画フレーム抽出ツール。MP4・WebM・MOV などをコマ単位で移動し、元の解像度のまま PNG・JPG・WebP で書き出せます。動画はアップロードされません。",
      keywords:
        "動画フレーム抽出,動画スクリーンショット,動画を画像に,コマ送り,フレーム書き出し,MP4 スクリーンショット",
      applicationName: "オフラインツール",
      ogDescription:
        "動画をコマ単位で移動し、元の解像度のまま PNG・JPG・WebP で書き出します。",
      ogImageAlt: "動画フレーム抽出ツール",
      twitterTitle: "動画フレーム抽出",
      twitterDescription:
        "アップロード不要。コマ送りで位置を決めて元の解像度で書き出します。",
      applicationNameJsonLd: "動画フレーム抽出",
      jsonLdDescription:
        "ブラウザ内で動画をコマ単位に移動し、元の解像度のまま PNG・JPG・WebP で書き出します。",
      features: [
        "1 コマずつ前後に移動",
        "元の解像度で書き出し",
        "PNG・JPG・WebP に対応",
        "動画はブラウザ内だけで処理",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "動画フレーム抽出",
      noscriptBody:
        "動画をコマ単位で移動し、元の解像度で画像を書き出します。動画はアップロードされません。",
      noscriptHomeLabel: "オフラインツールのホームへ戻る",
      breadcrumbHomeName: "オフラインツール",
    },
    "video-compress": {
      title: "動画圧縮ツール｜ブラウザ内で WebM に再エンコード - オフラインツール",
      description:
        "無料の動画圧縮ツール。ブラウザ内で動画を WebM に再エンコードし、ビットレートと等比縮小を調整できます。音声トラックはそのまま保持します。",
      keywords:
        "動画圧縮,動画を小さく,WebM 変換,ビットレート調整,動画サイズ削減,ブラウザで圧縮",
      applicationName: "オフラインツール",
      ogDescription:
        "ブラウザ内で WebM に再エンコード。ビットレートと等比縮小を調整できます。",
      ogImageAlt: "動画圧縮ツール",
      twitterTitle: "動画圧縮ツール",
      twitterDescription:
        "アップロード不要。ブラウザ内で WebM に再エンコードして圧縮します。",
      applicationNameJsonLd: "動画圧縮ツール",
      jsonLdDescription:
        "ブラウザ内で動画を WebM に再エンコードし、ビットレートと等比縮小を調整できます。音声トラックは保持します。",
      features: [
        "ビットレートを指定して圧縮",
        "動画サイズを等比で縮小",
        "元の音声トラックを保持",
        "動画はブラウザ内だけで処理",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "動画圧縮",
      noscriptBody: "アップロードせず、ブラウザ内で動画を圧縮します。",
      noscriptHomeLabel: "オフラインツールのホームへ戻る",
      breadcrumbHomeName: "オフラインツール",
    },
    "image-compress": {
      title: "画像圧縮ツール｜PNG・JPG・WebP を一括圧縮 - オフラインツール",
      description:
        "無料の画像圧縮ツール。PNG・JPG・WebP を一括で圧縮します。PNG は色数削減か可逆最適化を自動で選択。画像はアップロードされず、ブラウザ内で完結します。",
      keywords:
        "画像圧縮,画像を小さく,PNG 圧縮,JPG 圧縮,WebP 圧縮,一括圧縮,画像サイズ削減",
      applicationName: "オフラインツール",
      ogDescription:
        "PNG・JPG・WebP をブラウザ内で一括圧縮し、最適な方式を自動で選びます。",
      ogImageAlt: "画像圧縮ツール",
      twitterTitle: "画像圧縮ツール",
      twitterDescription:
        "アップロード不要。PNG・JPG・WebP を一括圧縮します。",
      applicationNameJsonLd: "画像圧縮ツール",
      jsonLdDescription:
        "ブラウザ内で PNG・JPG・WebP を一括圧縮し、画像に応じた方式を自動で選択します。",
      features: [
        "PNG・JPG・WebP を一括圧縮",
        "PNG は色数削減または可逆最適化を自動選択",
        "元より大きいファイルを生成しない",
        "画像はブラウザ内だけで処理",
      ],
      category: "MultimediaApplication",
      noscriptTitle: "画像圧縮",
      noscriptBody: "アップロードせず、ブラウザ内で画像を一括圧縮します。",
      noscriptHomeLabel: "オフラインツールのホームへ戻る",
      breadcrumbHomeName: "オフラインツール",
    },
    "image-watermark": {
      title: "画像ウォーターマーク｜テキストを一括で追加 - オフラインツール",
      description:
        "無料の画像ウォーターマークツール。テキストを一括で追加し、内容・サイズ・不透明度・角度を調整できます。元のサイズと形式、PNG の透過を保持します。",
      keywords:
        "画像ウォーターマーク,透かし追加,テキスト透かし,一括ウォーターマーク,写真に文字,PNG 透かし",
      applicationName: "オフラインツール",
      ogDescription:
        "PNG・JPG・WebP に調整可能なテキストウォーターマークを一括で追加します。",
      ogImageAlt: "画像ウォーターマークツール",
      twitterTitle: "画像ウォーターマーク",
      twitterDescription:
        "アップロード不要。テキストの透かしを一括で追加します。",
      applicationNameJsonLd: "画像ウォーターマーク",
      jsonLdDescription:
        "ブラウザ内で PNG・JPG・WebP に調整可能なテキストウォーターマークを一括で追加します。",
      features: [
        "テキストの透かしを一括追加",
        "サイズ・不透明度・角度を調整",
        "元のサイズと形式を保持",
        "PNG の透過を保持",
      ],
      category: "DesignApplication",
      noscriptTitle: "画像ウォーターマーク",
      noscriptBody:
        "アップロードせず、ブラウザ内で画像にテキストの透かしを追加します。",
      noscriptHomeLabel: "オフラインツールのホームへ戻る",
      breadcrumbHomeName: "オフラインツール",
    },
    "id-photo": {
      title: "証明写真｜1 寸・2 寸のトリミングと等比縮小 - オフラインツール",
      description:
        "ブラウザ内で証明写真のサイズを調整。1 寸・2 寸への等比縮小とドラッグでの位置指定トリミング、幅・高さを指定した縮小に対応。PNG・JPG・WebP を一括処理できます。",
      keywords:
        "証明写真,履歴書写真,1 寸写真,2 寸写真,写真トリミング,等比縮小,ローカル処理",
      applicationName: "オフラインツール",
      ogDescription:
        "1 寸・2 寸への等比縮小とドラッグでの位置指定、任意サイズへの縮小に対応。",
      ogImageAlt: "証明写真トリミングツール",
      twitterTitle: "証明写真",
      twitterDescription:
        "アップロード不要。ブラウザ内でトリミングと縮小ができます。",
      applicationNameJsonLd: "証明写真",
      jsonLdDescription:
        "1 寸・2 寸の位置指定トリミングと任意サイズへの等比縮小をブラウザ内で行います。",
      features: [
        "1 寸・2 寸のプリセット",
        "ドラッグで位置指定して等比トリミング",
        "任意サイズへの等比縮小",
        "PNG・JPG・WebP をローカル処理",
      ],
      category: "DesignApplication",
      noscriptTitle: "証明写真",
      noscriptBody:
        "アップロードせず、ブラウザ内で証明写真のサイズを整えます。",
      noscriptHomeLabel: "オフラインツールのホームへ戻る",
      breadcrumbHomeName: "オフラインツール",
    },
    "image-a4-layout": {
      title: "A4 画像レイアウト｜写真を一括で A4 印刷 - オフラインツール",
      description:
        "無料の A4 画像レイアウトツール。1 行あたり 1〜6 枚で画像を A4 用紙に流し込み、行の高さは画像の縦横比に合わせて自動調整。ブラウザの印刷機能をそのまま使えます。",
      keywords:
        "画像レイアウト,印刷レイアウト,A4 レイアウト,写真印刷,写真一括印刷,行レイアウト,証明写真レイアウト",
      applicationName: "オフラインツール",
      ogDescription:
        "1 行あたりの枚数を決めて A4 に流し込み、行高は自動調整されます。",
      ogImageAlt: "A4 画像レイアウト印刷ツール",
      twitterTitle: "A4 画像レイアウト",
      twitterDescription:
        "アップロード不要。A4 にレイアウトしてブラウザから印刷します。",
      applicationNameJsonLd: "A4 画像レイアウト",
      jsonLdDescription:
        "1 行あたりの枚数を指定して画像を A4 ページに流し込み、行高を縦横比に合わせて自動調整し、余白の変更・自動改ページ・印刷を行えます。",
      features: [
        "1 行あたり 1〜6 枚を自由に設定",
        "画像の縦横比に合わせた流し込み",
        "A4 余白の調整と自動改ページ",
        "比率を保ち、トリミングしない",
        "印刷ダイアログで A4 版面を出力",
        "画像はブラウザ内だけで処理",
      ],
      category: "DesignApplication",
      noscriptTitle: "A4 画像レイアウト",
      noscriptBody:
        "アップロードせず、ブラウザ内で画像を A4 用紙にレイアウトします。",
      noscriptHomeLabel: "オフラインツールのホームへ戻る",
      breadcrumbHomeName: "オフラインツール",
    },
  },
};

/** 工具在首页 ItemList / 结构化数据里的应用类别（图片类为设计，其余为多媒体）。 */
export const categoryForRoute = (route: ToolRoute): string =>
  SEO_CONTENT.en[route].category;

