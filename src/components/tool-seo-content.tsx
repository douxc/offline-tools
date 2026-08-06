import { navigateToTool, TOOL_PATHS } from "@/lib/tool-navigation";

type ToolSeoContentProps = {
  tool: "video" | "compress" | "watermark";
};

const content = {
  video: {
    eyebrow: "VIDEO FRAME GUIDE",
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
  compress: {
    eyebrow: "IMAGE COMPRESSION GUIDE",
    title: "在线图片压缩：批量减小 PNG、JPG 与 WebP 体积",
    introduction:
      "这个在线图片压缩工具可一次处理多张 PNG、JPG、JPEG 或 WebP 图片。所有压缩都在浏览器本地完成，适合网站图片优化、邮件附件、社交媒体素材和日常存储。",
    details: [
      {
        title: "PNG 智能压缩",
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
    eyebrow: "WATERMARK GUIDE",
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
} as const;

export function ToolSeoContent({ tool }: ToolSeoContentProps) {
  const current = content[tool];

  return (
    <section className="seo-content" aria-labelledby={`${tool}-seo-title`}>
      <div className="seo-content-heading">
        <p className="eyebrow">{current.eyebrow}</p>
        <h2 id={`${tool}-seo-title`}>{current.title}</h2>
        <p>{current.introduction}</p>
      </div>

      <div className="seo-detail-grid">
        {current.details.map((detail) => (
          <article key={detail.title}>
            <h3>{detail.title}</h3>
            <p>{detail.text}</p>
          </article>
        ))}
      </div>

      <nav className="seo-related-links" aria-label="相关离线工具">
        <span>相关工具</span>
        {tool !== "video" && (
          <a
            href={TOOL_PATHS["video-frame"]}
            onClick={(event) => navigateToTool(event, "video-frame")}
          >
            在线视频取帧
          </a>
        )}
        {tool !== "compress" && (
          <a
            href={TOOL_PATHS["image-compress"]}
            onClick={(event) => navigateToTool(event, "image-compress")}
          >
            在线图片压缩
          </a>
        )}
        {tool !== "watermark" && (
          <a
            href={TOOL_PATHS["image-watermark"]}
            onClick={(event) => navigateToTool(event, "image-watermark")}
          >
            批量图片加水印
          </a>
        )}
      </nav>
    </section>
  );
}
