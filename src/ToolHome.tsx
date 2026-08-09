import { ArrowRight, Image, ShieldCheck, Video } from "lucide-react";
import { ToolHeader } from "@/components/tool-header";
import {
  navigateToTool,
  TOOL_PATHS,
  type ToolRoute,
} from "@/lib/tool-navigation";

const tools: Array<{
  route: ToolRoute;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Video;
}> = [
  {
    route: "video-frame",
    eyebrow: "视频工具",
    title: "视频取帧",
    description: "逐帧定位画面，按视频原始分辨率导出 PNG、JPG 或 WebP。",
    icon: Video,
  },
  {
    route: "image-compress",
    eyebrow: "图片工具",
    title: "图片压缩",
    description: "使用 libimagequant、OxiPNG 与浏览器编码器减小图片体积。",
    icon: Image,
  },
  {
    route: "image-watermark",
    eyebrow: "水印工具",
    title: "图片添加水印",
    description: "批量添加文字水印，保持原始尺寸、格式与 PNG 透明通道。",
    icon: ShieldCheck,
  },
];

export function ToolHome() {
  return (
    <main className="app-shell tool-home">
      <ToolHeader active="home" />
      <section className="tool-home-hero">
        <p className="eyebrow">隐私优先 · 本地处理</p>
        <h1>
          文件留在本机，
          <br />
          <span>处理发生在浏览器。</span>
        </h1>
        <p>
          无需上传、无需账户。首次打开完成缓存后，断网也可以继续使用。
        </p>
      </section>

      <section className="tool-directory" aria-label="离线工具列表">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <a
              className="tool-directory-card"
              href={TOOL_PATHS[tool.route]}
              onClick={(event) => navigateToTool(event, tool.route)}
              key={tool.route}
            >
              <div className="tool-card-index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="tool-card-icon" aria-hidden="true">
                <Icon />
              </div>
              <p>{tool.eyebrow}</p>
              <h2>{tool.title}</h2>
              <span>{tool.description}</span>
              <strong>
                打开工具 <ArrowRight size={17} />
              </strong>
            </a>
          );
        })}
      </section>

      <section className="seo-content home-seo-content" aria-labelledby="toolbox-guide">
        <div className="seo-content-heading">
          <p className="eyebrow">关于这套工具</p>
          <h2 id="toolbox-guide">无需上传文件的浏览器离线工具箱</h2>
          <p>
            离线工具提供在线视频取帧、批量图片压缩和图片加水印功能。
            工具直接调用浏览器的视频解码、图片编码与画布能力，文件始终留在当前设备。
          </p>
        </div>
        <div className="seo-detail-grid">
          <article>
            <h3>视频取帧与视频截图</h3>
            <p>
              从 MP4、WebM、MOV 等视频中逐帧选择画面，并按原始分辨率导出
              PNG、JPG 或 WebP 图片。
            </p>
          </article>
          <article>
            <h3>PNG、JPG、WebP 图片压缩</h3>
            <p>
              批量减小图片文件体积，PNG
              自动选择颜色量化或无损优化策略，兼顾画质与压缩效果。
            </p>
          </article>
          <article>
            <h3>批量图片添加文字水印</h3>
            <p>
              调整水印文字、大小、透明度与角度，保持原始尺寸和格式，并保留
              PNG 透明背景。
            </p>
          </article>
        </div>
      </section>

      <footer className="license-footer">
        <span>GPL-3.0-or-later · 本地处理 · 不上传文件</span>
        <a href="/legal/THIRD_PARTY_NOTICES.md">第三方许可</a>
        <a href="/legal/CORRESPONDING_SOURCE.md">对应源代码</a>
      </footer>
    </main>
  );
}
