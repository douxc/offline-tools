import { useEffect } from "react";
import type { ToolRoute } from "@/lib/tool-navigation";

const SITE_URL = "https://framecut-offline.douxc512.chatgpt.site";
const OG_IMAGE_URL = `${SITE_URL}/og.png`;

type SeoPage = {
  title: string;
  description: string;
  keywords: string;
  path: string;
  jsonLd: Record<string, unknown>;
};

const toolJsonLd = ({
  name,
  description,
  path,
  category,
  features,
}: {
  name: string;
  description: string;
  path: string;
  category: string;
  features: string[];
}) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "离线工具",
          item: `${SITE_URL}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name,
          item: `${SITE_URL}${path}`,
        },
      ],
    },
    {
      "@type": "WebApplication",
      name,
      url: `${SITE_URL}${path}`,
      description,
      applicationCategory: category,
      applicationSubCategory: "Browser-based utility",
      operatingSystem: "Windows, macOS, Linux, Android, iOS",
      browserRequirements: "Requires JavaScript and an HTML5-compatible browser",
      inLanguage: "zh-CN",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
      },
      featureList: features,
      image: OG_IMAGE_URL,
    },
  ],
});

export const SEO_PAGES: Record<ToolRoute, SeoPage> = {
  home: {
    title: "离线工具箱｜在线视频取帧、图片压缩与图片加水印",
    description:
      "免费浏览器离线工具箱：在线完成视频取帧、视频截图、PNG/JPG/WebP 图片压缩和批量图片加水印。文件只在本机处理，无需上传或注册。",
    keywords:
      "离线工具,在线工具箱,浏览器工具,视频取帧,视频截图,图片压缩,图片加水印,批量图片处理,本地处理",
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "离线工具",
          alternateName: "浏览器离线工具箱",
          url: `${SITE_URL}/`,
          inLanguage: "zh-CN",
        },
        {
          "@type": "CollectionPage",
          name: "离线工具箱",
          url: `${SITE_URL}/`,
          description:
            "无需上传文件的在线视频取帧、图片压缩与图片加水印工具集合。",
          inLanguage: "zh-CN",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "视频取帧工具",
                url: `${SITE_URL}/video-frame/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "在线图片压缩工具",
                url: `${SITE_URL}/image-compress/`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: "图片加水印工具",
                url: `${SITE_URL}/image-watermark/`,
              },
            ],
          },
        },
      ],
    },
  },
  "video-frame": {
    title: "视频取帧工具｜在线逐帧截图、视频转图片 - 离线工具",
    description:
      "免费在线视频取帧工具，支持逐帧定位 MP4、WebM、MOV 等视频画面，按原始分辨率导出 PNG、JPG 或 WebP。视频不上传，浏览器本地处理。",
    keywords:
      "视频取帧,视频截图,视频转图片,在线截帧,逐帧截图,提取视频帧,MP4截图,视频帧导出",
    path: "/video-frame/",
    jsonLd: toolJsonLd({
      name: "视频取帧工具",
      description:
        "在浏览器本地逐帧定位视频画面，并按原始分辨率导出 PNG、JPG 或 WebP 图片。",
      path: "/video-frame/",
      category: "MultimediaApplication",
      features: [
        "逐帧前进与后退",
        "按原始分辨率导出",
        "支持 PNG、JPG 与 WebP",
        "视频仅在浏览器本地处理",
      ],
    }),
  },
  "video-compress": {
    title: "在线视频压缩工具｜浏览器本地压缩导出 WebM - 离线工具",
    description:
      "免费在线视频压缩工具，在浏览器中重新编码视频为 WebM，可控码率与等比缩放尺寸，保留原音轨。视频不上传，本地完成压缩导出。",
    keywords:
      "视频压缩,在线视频压缩,视频压缩导出,WebM压缩,视频减小体积,浏览器压缩视频,本地视频处理",
    path: "/video-compress/",
    jsonLd: toolJsonLd({
      name: "在线视频压缩工具",
      description:
        "在浏览器本地通过 MediaRecorder 重新编码视频为 WebM，可控码率与等比缩放，保留原音轨。",
      path: "/video-compress/",
      category: "MultimediaApplication",
      features: [
        "可控码率压缩导出",
        "等比缩放视频尺寸",
        "保留原音轨",
        "视频仅在浏览器本地处理",
      ],
    }),
  },
  "image-compress": {
    title: "在线图片压缩工具｜批量压缩 PNG、JPG、WebP - 离线工具",
    description:
      "免费在线图片压缩工具，批量压缩 PNG、JPG 和 WebP。PNG 自动选择颜色量化或无损优化，图片不上传，直接在浏览器本地减小文件体积。",
    keywords:
      "图片压缩,在线图片压缩,批量图片压缩,PNG压缩,JPG压缩,JPEG压缩,WebP压缩,无损图片压缩,减小图片体积",
    path: "/image-compress/",
    jsonLd: toolJsonLd({
      name: "在线图片压缩工具",
      description:
        "在浏览器本地批量压缩 PNG、JPG 与 WebP 图片，自动选择合适的压缩策略。",
      path: "/image-compress/",
      category: "MultimediaApplication",
      features: [
        "批量压缩 PNG、JPG 与 WebP",
        "PNG 自适应量化或无损优化",
        "避免生成比原图更大的文件",
        "图片仅在浏览器本地处理",
      ],
    }),
  },
  "image-watermark": {
    title: "图片加水印工具｜在线批量添加文字水印 - 离线工具",
    description:
      "免费图片加水印工具，在线批量添加文字水印，可调整文字内容、大小、透明度和角度。保持原始尺寸、格式及 PNG 透明背景，图片不上传。",
    keywords:
      "图片加水印,在线加水印,批量加水印,文字水印,照片加水印,PNG加水印,JPG加水印,WebP加水印",
    path: "/image-watermark/",
    jsonLd: toolJsonLd({
      name: "图片加水印工具",
      description:
        "在浏览器本地为 PNG、JPG 与 WebP 图片批量添加可调节的文字水印。",
      path: "/image-watermark/",
      category: "DesignApplication",
      features: [
        "批量添加文字水印",
        "调整文字大小、透明度与角度",
        "保持图片原始尺寸和格式",
        "保留 PNG 透明通道",
      ],
    }),
  },
};

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute(
    "content",
    content,
  );
}

export function useRouteSeo(route: ToolRoute) {
  useEffect(() => {
    const seo = SEO_PAGES[route];
    const canonicalUrl = `${SITE_URL}${seo.path}`;

    document.title = seo.title;
    setMeta('meta[name="description"]', seo.description);
    setMeta('meta[name="keywords"]', seo.keywords);
    setMeta('meta[property="og:title"]', seo.title);
    setMeta('meta[property="og:description"]', seo.description);
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[name="twitter:title"]', seo.title);
    setMeta('meta[name="twitter:description"]', seo.description);

    document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute("href", canonicalUrl);

    const structuredData = document.querySelector<HTMLScriptElement>(
      "#structured-data",
    );
    if (structuredData) {
      structuredData.textContent = JSON.stringify(seo.jsonLd);
    }
  }, [route]);
}
