import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: {
      default: "帧切 · 离线视频取帧",
      template: "%s · 帧切",
    },
    description: "视频不上传，在浏览器中精准选帧并导出原始分辨率图片。",
    applicationName: "帧切",
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "帧切 · 从视频里，定格这一帧",
      description: "完全离线的视频取帧工具，支持逐帧微调和多种图片格式。",
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "帧切离线视频取帧工具",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "帧切 · 从视频里，定格这一帧",
      description: "完全离线的视频取帧工具，支持逐帧微调和多种图片格式。",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
