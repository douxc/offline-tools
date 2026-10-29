/**
 * 工具页正文 SEO 长文的**三语数据源**。
 *
 * 与 `seo-content.ts`（元数据：标题/描述/关键词/JSON-LD）分开，是因为这里的
 * 内容是面向读者的成段说明文字，两种数据的消费方与更新节奏都不同；放在同一个
 * 文件里会让元数据被长文淹没。
 *
 * 与语言数据模块一样不得 import React 或浏览器全局。
 */
import type { LocaleCode } from "./locales";

/** 组件对外暴露的工具标识（与 `ToolRoute` 不完全一一对应：压缩与水印各自成组）。 */
export type SeoContentTool =
  | "video"
  | "video-compress"
  | "compress"
  | "watermark"
  | "a4"
  | "id-photo";

export type SeoDetail = {
  readonly title: string;
  readonly text: string;
};

export type SeoLongForm = {
  readonly eyebrow: string;
  readonly title: string;
  readonly introduction: string;
  readonly details: readonly SeoDetail[];
};

export type MultilingualSeoLongForm = Record<
  LocaleCode,
  Record<SeoContentTool, SeoLongForm>
>;

export const SEO_LONG_FORM: MultilingualSeoLongForm = {
  en: {
    video: {
      eyebrow: "How to use",
      title: "Online frame extraction: step through a video and export original-quality images",
      introduction:
        "This frame extractor pulls single frames out of MP4, WebM and MOV videos. After choosing a video you can pinpoint a moment with the timeline, the arrow keys or the step buttons, then export that frame as a PNG, JPG or WebP image.",
      details: [
        {
          title: "How do I extract a frame from a video?",
          text: "Import a local video and drag the timeline to the moment you want. For an exact screenshot, nudge frame by frame with the left and right arrow keys. Pick an image format and quality, then press \u201cExport current frame\u201d to save it.",
        },
        {
          title: "Screenshots at the original resolution",
          text: "Export uses the video's own width and height, so the image is never scaled or cropped. PNG suits crisp frames and transparency workflows, while JPG and WebP can shrink the file through the quality setting.",
        },
        {
          title: "Your video is never uploaded",
          text: "Decoding, frame-by-frame preview and screenshot generation all happen in this browser. Nothing is sent to a server, which makes it suitable for private recordings, work footage and unreleased material.",
        },
      ],
    },
    "video-compress": {
      eyebrow: "How to use",
      title: "Online video compression: re-encode to WebM in the browser",
      introduction:
        "This compressor re-encodes a local video to WebM with a bitrate you choose and proportional scaling, keeping the original audio track. Decoding and encoding run in this browser tab; the file is never uploaded.",
      details: [
        {
          title: "A bitrate and size you choose",
          text: "Pick the target bitrate and the output keeps the video's aspect ratio; the file size follows the bitrate. The settings stay on this device.",
        },
        {
          title: "The original audio track",
          text: "The compressor keeps the original audio track in the WebM output. Re-encoding plays the video through once and records the result, so it takes roughly the video's running time.",
        },
        {
          title: "Nothing is uploaded",
          text: "The local file is decoded, re-encoded and downloaded in this tab; no account is required and no server receives the video.",
        },
      ],
    },
    compress: {
      eyebrow: "How to use",
      title: "Online image compression: shrink PNG, JPG and WebP in bulk",
      introduction:
        "This image compressor handles many PNG, JPG, JPEG or WebP files at once. All compression runs locally in the browser, which suits website optimisation, email attachments, social media assets and everyday storage.",
      details: [
        {
          title: "Adaptive PNG compression",
          text: "The tool inspects each PNG: icons, screenshots and flat illustrations can lose file size through colour quantisation, while continuous-tone images prefer lossless OxiPNG optimisation, balancing size against visual quality.",
        },
        {
          title: "Batch compress JPG and WebP",
          text: "Adjust the output quality for JPG, JPEG and WebP in one go and download the results together. If a new file is not smaller, the tool keeps the better version rather than needlessly inflating it.",
        },
        {
          title: "Images never need uploading",
          text: "Reading, encoding and downloading all happen in your own browser, with no account required. Once the first visit is cached, image compression keeps working even offline.",
        },
      ],
    },
    watermark: {
      eyebrow: "How to use",
      title: "Online image watermarking: add adjustable text watermarks in bulk",
      introduction:
        "This watermark tool processes PNG, JPG, JPEG and WebP in bulk. Enter your watermark text, adjust its size, opacity and angle live, then download every image in one go.",
      details: [
        {
          title: "Add text watermarks in bulk",
          text: "Import many photos, design files or product shots at once, apply the same text watermark and process them together — useful for copyright marking, sample protection, brand display and document circulation.",
        },
        {
          title: "Keeps size, format and transparency",
          text: "Output images keep their original pixel dimensions and file format. When processing PNG the alpha channel is preserved, so transparent backgrounds are never filled with white.",
        },
        {
          title: "Private images stay local",
          text: "Watermark preview, compositing and export all happen in this browser. Images are never uploaded to a server, which suits ID photos, client assets and internal documents.",
        },
      ],
    },
    a4: {
      eyebrow: "How to use",
      title: "A4 image layout: flow images by images-per-row and print",
      introduction:
        "This A4 layout tool flows local images onto A4 pages by images-per-row, with row heights adapting to each image's real aspect ratio. Adjust the margins, paginate automatically, and print a 210mm × 297mm layout from the browser.",
      details: [
        {
          title: "You only set images per row",
          text: "Place 1–6 images across each row. Images fill the current row in import order at their original proportions, the row height follows the tallest image, and anything that does not fit flows onto the next page.",
        },
        {
          title: "Prints an exact A4 sheet",
          text: "The browser print dialog is used with a dedicated print stylesheet that hides interface elements. The layout is exactly 210mm × 297mm and margins come from the page padding, without stacking on the browser's defaults.",
        },
        {
          title: "Your images stay local",
          text: "Imported images are decoded and laid out through local Blob URLs only, never uploaded. Suited to printing group photos, laying out ID photos and paging through screenshots.",
        },
      ],
    },
    "id-photo": {
      eyebrow: "How to use",
      title: "ID photos: standard size cropping and custom proportional scaling",
      introduction:
        "Pick a one-inch or two-inch preset, drag and zoom the image to position it, then crop. You can also set a custom width or height to scale the whole image down proportionally. PNG, JPG and WebP are processed locally in the browser, with nothing uploaded.",
      details: [
        {
          title: "Fixed sizes, composed one by one",
          text: "One-inch output is 295 × 413 px and two-inch is 413 × 579 px. The fixed frame shows exactly what will be kept, and you can drag, scale proportionally or reset the position; enlarging may soften the image. Each photo keeps its own composition.",
        },
        {
          title: "Custom mode only shrinks",
          text: "Specify a width or height and the other side is calculated and rounded. The full picture is kept and enlarging is not supported; when the source is smaller than the target the reason is explained. Changing settings requires reprocessing, and output keeps the original format and transparent areas.",
        },
        {
          title: "Pixel sizes and local downloads",
          text: "Millimetre sizes are converted at 300 PPI and no print density metadata is written. This tool only handles sizing and cropping — check the requirements for your specific use. \u201cDownload all\u201d saves images one by one; if the browser blocks multiple downloads, use the single-image download.",
        },
      ],
    },
  },
  "zh-CN": {
    "id-photo": {
      eyebrow: "使用说明",
      title: "证件照：常用尺寸裁切与自定义等比缩放",
      introduction:
        "选择一寸、二寸预设，拖动与缩放图片定位后裁切；也可以自定义宽度或高度，按原始比例缩小完整图片。PNG、JPG 和 WebP 在浏览器本地处理，无需上传。",
      details: [
        {
          title: "固定尺寸，逐张构图",
          text: "一寸输出 295 × 413 px，二寸输出 413 × 579 px。固定框内显示最终保留内容，可拖动、等比缩放和重置位置；放大可能降低清晰度。每张照片单独保存构图。",
        },
        {
          title: "自定义只缩小",
          text: "指定宽度或高度，另一边自动计算并取整。保留完整画面，不支持放大；原图不足目标尺寸时会说明原因。改变设置后需要重新处理，输出保持原图格式和透明区域。",
        },
        {
          title: "像素尺寸与本地下载",
          text: "毫米尺寸按 300 PPI 换算为像素，不设置图片打印密度元数据。此工具只处理尺寸和裁切，背景与人像要求请参考具体用途。下载全部会逐张保存，若浏览器限制多文件下载，可使用单张下载。",
        },
      ],
    },
    video: {
      eyebrow: "使用说明",
      title: "在线视频取帧：逐帧截图并导出原始画质图片",
      introduction:
        "这个视频取帧工具适合从 MP4、WebM、MOV 等视频中提取单帧画面。选择视频后，可通过时间轴、方向键或逐帧按钮精确定位，再把当前视频帧导出为 PNG、JPG 或 WebP 图片。",
      details: [
        {
          title: "如何从视频提取一帧？",
          text: "导入本地视频，拖动时间轴找到目标位置；需要精确截图时，使用左右方向键逐帧调整。选择图片格式与质量后，点击“导出当前帧”即可保存。",
        },
        {
          title: "原始分辨率视频截图",
          text: "导出过程使用视频自身的宽高，不对画面缩放或裁剪。PNG 适合清晰画面与透明工作流，JPG 和 WebP 可通过质量选项减小文件体积。",
        },
        {
          title: "视频不上传",
          text: "视频解码、逐帧预览和截图生成均在当前浏览器中完成。文件不会发送到服务器，适合处理私人录像、工作素材和未公开视频。",
        },
      ],
    },
    "video-compress": {
      eyebrow: "使用说明",
      title: "在线视频压缩：在浏览器里重新编码为 WebM",
      introduction:
        "这个压缩工具用可调码率和等比缩放把本地视频重新编码为 WebM，并保留原音轨。解码与编码都在这个浏览器标签页里完成，文件不会上传。",
      details: [
        {
          title: "码率与体积由你决定",
          text: "选择目标码率，输出保持原视频的宽高比，文件体积随码率变化。设置留在本机。",
        },
        {
          title: "保留原音轨",
          text: "压缩后的 WebM 保留原音轨。重新编码会完整播放一遍视频并录制结果，因此大约需要视频本身的时长。",
        },
        {
          title: "不上传文件",
          text: "本地文件在这个标签页里解码、重新编码并下载；无需账户，也没有服务器接收视频。",
        },
      ],
    },
    compress: {
      eyebrow: "使用说明",
      title: "在线图片压缩：批量减小 PNG、JPG 与 WebP 体积",
      introduction:
        "这个在线图片压缩工具可一次处理多张 PNG、JPG、JPEG 或 WebP 图片。所有压缩都在浏览器本地完成，适合网站图片优化、邮件附件、社交媒体素材和日常存储。",
      details: [
        {
          title: "PNG 自适应压缩",
          text: "工具会分析 PNG 内容：图标、截图和透明插画可使用颜色量化减小体积，连续色调图片则优先采用 OxiPNG 无损优化，兼顾文件大小与画面质量。",
        },
        {
          title: "批量压缩 JPG 与 WebP",
          text: "可统一调整 JPG、JPEG 和 WebP 的输出质量，并批量下载处理结果。若新文件没有变小，工具会保留更合适的版本，避免无意义地增加体积。",
        },
        {
          title: "图片无需上传",
          text: "图片读取、编码和下载都发生在本机浏览器中，不需要注册账户。首次缓存完成后，即使断网也能继续使用图片压缩功能。",
        },
      ],
    },
    watermark: {
      eyebrow: "使用说明",
      title: "在线图片加水印：批量添加可调节的文字水印",
      introduction:
        "这个图片加水印工具支持批量处理 PNG、JPG、JPEG 与 WebP。输入水印文字后，可实时调整文字大小、透明度和倾斜角度，再一次下载全部图片。",
      details: [
        {
          title: "批量添加文字水印",
          text: "一次导入多张照片、设计稿或商品图，设置相同的文字水印后统一处理，适合版权标记、样片保护、品牌展示和资料流转。",
        },
        {
          title: "保持尺寸、格式和透明背景",
          text: "输出图片保持原始像素尺寸与文件格式。处理 PNG 时会保留透明通道，不会把透明背景填成白色。",
        },
        {
          title: "私密图片本地处理",
          text: "水印预览、合成和导出完全在当前浏览器中进行，图片不会上传到服务器，适合处理证件样图、客户素材和内部文件。",
        },
      ],
    },
    a4: {
      eyebrow: "使用说明",
      title: "图片 A4 排版：按每行张数流动排版并打印",
      introduction:
        "这个图片 A4 排版工具把本地图片按每行张数流动排入 A4 页面，行高按图片实际宽高比自适应。可调页边距、自动分页，并通过浏览器打印输出 210mm × 297mm 版面。",
      details: [
        {
          title: "只需要设置每行张数",
          text: "横向每行放 1–6 张，图片按导入顺序依次排入当前行并保持原始比例，行高由该行最高的图片决定，多出的图片自动排到下一页。",
        },
        {
          title: "打印输出精确 A4",
          text: "调用浏览器打印对话框，专用打印样式隐藏界面元素，版面精准为 210mm × 297mm，页边距由页面内边距控制，不叠加浏览器默认页边距。",
        },
        {
          title: "图片保持在本地",
          text: "导入的图片仅通过本地 Blob URL 解码与排版，不会上传。适合冲印合影、排版打印证件照与资料截图。",
        },
      ],
    },
  },
  ja: {
    video: {
      eyebrow: "使い方",
      title: "オンライン動画フレーム抽出：コマ送りで元画質の画像を書き出す",
      introduction:
        "このフレーム抽出ツールは MP4・WebM・MOV などの動画から 1 コマを取り出します。動画を選んだら、タイムライン・矢印キー・コマ送りボタンで位置を正確に合わせ、そのコマを PNG・JPG・WebP として書き出せます。",
      details: [
        {
          title: "動画から 1 コマを取り出すには？",
          text: "ローカルの動画を読み込み、タイムラインを目的の位置までドラッグします。正確に切り出したいときは左右の矢印キーで 1 コマずつ調整してください。画像形式と品質を選び、「現在のフレームを書き出す」を押すと保存できます。",
        },
        {
          title: "元の解像度のままスクリーンショット",
          text: "書き出しには動画自身の幅と高さを使うため、拡大・縮小やトリミングは行いません。PNG はくっきりした画面や透過を扱う用途に、JPG と WebP は品質設定でファイルサイズを抑えたい用途に向きます。",
        },
        {
          title: "動画はアップロードされません",
          text: "デコード・コマ送りプレビュー・画像の生成はすべてこのブラウザ内で完結します。サーバーへ送信されないため、私的な録画や仕事の素材、未公開の動画にも向いています。",
        },
      ],
    },
    "video-compress": {
      eyebrow: "使い方",
      title: "オンライン動画圧縮：ブラウザで WebM に再エンコード",
      introduction:
        "この圧縮ツールは、選んだビットレートと比率を保った縮小でローカル動画を WebM に再エンコードし、元の音声トラックを残します。デコードとエンコードはこのタブの中で行われ、ファイルはアップロードされません。",
      details: [
        {
          title: "ビットレートとサイズを選ぶ",
          text: "目標のビットレートを選ぶと、出力は元の縦横比を保ち、ファイルサイズはビットレートに従います。設定はこの端末に残ります。",
        },
        {
          title: "元の音声トラック",
          text: "WebM 出力には元の音声トラックが残ります。再エンコードは動画を一度再生して記録するため、動画の長さに近い時間がかかります。",
        },
        {
          title: "アップロードなし",
          text: "ローカルファイルはこのタブでデコード・再エンコード・ダウンロードされます。アカウントもサーバーも不要です。",
        },
      ],
    },
    compress: {
      eyebrow: "使い方",
      title: "オンライン画像圧縮：PNG・JPG・WebP を一括で軽くする",
      introduction:
        "この画像圧縮ツールは PNG・JPG・JPEG・WebP をまとめて処理します。圧縮はすべてブラウザ内で完結するため、サイト画像の最適化、メール添付、SNS 用素材、日常的な保管に向いています。",
      details: [
        {
          title: "PNG は内容に応じて自動選択",
          text: "ツールは PNG の内容を解析します。アイコン・スクリーンショット・透過イラストは色数削減で軽くし、連続階調の画像は可逆の OxiPNG 最適化を優先し、ファイルサイズと画質の両立を図ります。",
        },
        {
          title: "JPG と WebP の一括圧縮",
          text: "JPG・JPEG・WebP の出力品質をまとめて調整し、結果を一括ダウンロードできます。新しいファイルが小さくならなかった場合は、無意味にサイズを増やさず、より適した方の版を残します。",
        },
        {
          title: "画像のアップロードは不要",
          text: "読み込み・エンコード・ダウンロードはすべてお使いのブラウザ内で行われ、アカウント登録も不要です。初回のキャッシュ後は、オフラインでも画像圧縮を使えます。",
        },
      ],
    },
    watermark: {
      eyebrow: "使い方",
      title: "オンライン画像ウォーターマーク：調整できるテキストを一括追加",
      introduction:
        "このウォーターマークツールは PNG・JPG・JPEG・WebP を一括処理します。透かしの文字を入力し、サイズ・不透明度・角度をその場で調整して、すべての画像をまとめてダウンロードできます。",
      details: [
        {
          title: "テキストの透かしを一括追加",
          text: "写真・デザインデータ・商品画像をまとめて読み込み、同じテキストの透かしを一度に適用できます。著作権表示、サンプル保護、ブランド表示、資料の配布に向いています。",
        },
        {
          title: "サイズ・形式・透過を保持",
          text: "出力画像は元のピクセルサイズとファイル形式を保ちます。PNG を処理するときはアルファチャンネルを保持するため、透過部分が白く塗りつぶされることはありません。",
        },
        {
          title: "私的な画像も端末内で",
          text: "プレビュー・合成・書き出しはすべてこのブラウザ内で行われ、画像がサーバーへ送信されることはありません。証明写真の見本、顧客素材、社内資料の処理に向いています。",
        },
      ],
    },
    a4: {
      eyebrow: "使い方",
      title: "A4 画像レイアウト：1 行の枚数で流し込んで印刷",
      introduction:
        "この A4 レイアウトツールは、1 行あたりの枚数を指定してローカルの画像を A4 ページへ流し込みます。行の高さは画像の実際の縦横比に合わせて決まります。余白の調整・自動改ページができ、ブラウザから 210mm × 297mm の版面を印刷できます。",
      details: [
        {
          title: "設定するのは 1 行の枚数だけ",
          text: "横に 1〜6 枚を並べます。画像は読み込んだ順に元の比率のまま現在の行へ入り、行の高さはその行で最も高い画像で決まり、収まらない画像は自動的に次のページへ流れます。",
        },
        {
          title: "正確な A4 で印刷",
          text: "ブラウザの印刷ダイアログを使い、印刷専用スタイルで画面の要素を隠します。版面はちょうど 210mm × 297mm で、余白はページ内の余白として確保し、ブラウザ既定の余白は重ねません。",
        },
        {
          title: "画像は端末内に保持",
          text: "読み込んだ画像はローカルの Blob URL だけでデコードとレイアウトを行い、アップロードしません。集合写真の印刷、証明写真の面付け、スクリーンショットの整理に向いています。",
        },
      ],
    },
    "id-photo": {
      eyebrow: "使い方",
      title: "証明写真：定番サイズのトリミングと任意の等比縮小",
      introduction:
        "1 寸・2 寸のプリセットを選び、画像をドラッグ・拡大縮小して位置を決めてからトリミングします。幅または高さを指定して、画像全体を等比で縮小することもできます。PNG・JPG・WebP はブラウザ内で処理し、アップロードは不要です。",
      details: [
        {
          title: "固定サイズで 1 枚ずつ構図",
          text: "1 寸は 295 × 413 px、2 寸は 413 × 579 px で出力します。固定枠には残る範囲がそのまま表示され、ドラッグ・等比拡大縮小・位置のリセットができます。拡大すると鮮明さが落ちることがあります。構図は写真ごとに保持されます。",
        },
        {
          title: "任意サイズは縮小のみ",
          text: "幅または高さを指定すると、もう一方は自動計算して整数に丸めます。画面全体を保ち、拡大には対応しません。元画像が目標サイズに足りない場合は理由を表示します。設定を変えたら再処理が必要で、出力は元の形式と透過部分を保ちます。",
        },
        {
          title: "ピクセルサイズと端末内ダウンロード",
          text: "ミリ単位のサイズは 300 PPI でピクセルに換算し、印刷密度のメタデータは書き込みません。このツールはサイズとトリミングだけを扱います。背景や人物の要件は用途ごとにご確認ください。「すべてダウンロード」は 1 枚ずつ保存します。ブラウザが複数ファイルのダウンロードを制限する場合は、1 枚ずつのダウンロードをお使いください。",
        },
      ],
    },
  },
};

export const seoLongFormFor = (
  locale: LocaleCode,
  tool: SeoContentTool,
): SeoLongForm => SEO_LONG_FORM[locale][tool];
