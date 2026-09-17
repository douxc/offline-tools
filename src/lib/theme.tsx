import { useEffect } from "react";
import {
  useTheme as useNextTheme,
  ThemeProvider as NextThemeProvider,
} from "next-themes";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";

/** 与历史实现保持一致的存储键,避免升级后丢失用户已选主题。 */
const THEME_STORAGE_KEY = "offline-tools-theme";

/** 页面底色:用于同步 meta[name="theme-color"],与 index.css 的 --background 对应。 */
const SURFACE_COLOR: Record<Theme, string> = {
  dark: "#000000",
  light: "#f5f5f7",
};

/**
 * 主题上下文。
 *
 * 主题状态由 next-themes 管理(shadcn 方案):它以 `.dark` 类为键写入根元素,
 * 负责持久化、系统偏好跟随与首帧前应用。本模块只做两件事:
 *   1. 保持项目原有的 `{ theme, toggleTheme }` 消费接口,调用点无需改动;
 *   2. 在主题变化时同步 meta[name="theme-color"]。
 *
 * 本项目视觉为暗色优先,故 defaultTheme 为 "dark";enableSystem 允许未显式
 * 选择的用户跟随系统偏好(与历史 getInitialTheme 的行为一致)。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      value={{ light: "light", dark: "dark" }}
      disableTransitionOnChange
      enableColorScheme={false}
    >
      <ThemeColorSync />
      {children}
    </NextThemeProvider>
  );
}

/** 主题变化时同步 meta[name="theme-color"],使浏览器 UI 与页面底色一致。 */
function ThemeColorSync() {
  const theme = useResolvedTheme();

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", SURFACE_COLOR[theme]);
  }, [theme]);

  return null;
}

/** next-themes 的 resolvedTheme 在挂载前为 undefined,统一收敛为 dark 优先。 */
function useResolvedTheme(): Theme {
  const { resolvedTheme } = useNextTheme();
  return resolvedTheme === "light" ? "light" : "dark";
}

export function useTheme() {
  const { setTheme } = useNextTheme();
  const theme = useResolvedTheme();

  return {
    theme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
