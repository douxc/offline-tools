type LogoMarkProps = {
  className?: string;
};

/**
 * 品牌标记：O + 收音机刻度。
 * 闭合方框是 O / Offline / 这个标签页；里面是七根竖线——收音机的调谐刻度。
 * 中间那根更高、颜色是 azure（当前工具/信号），两侧六根是灰蓝（六个工具）。
 * 直角、无圆角；页头 26px，页脚 24px。favicon 与 PWA 图标用同一枚标记。
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect
        className="logo-mark-surface"
        x="0.5"
        y="0.5"
        width="31"
        height="31"
      />
      <rect
        className="logo-mark-frame"
        x="0.5"
        y="0.5"
        width="31"
        height="31"
      />
      <g className="logo-mark-scale">
        <rect x="6.25" y="11.5" width="1.5" height="9" />
        <rect x="9.25" y="11.5" width="1.5" height="9" />
        <rect x="12.25" y="11.5" width="1.5" height="9" />
        <rect x="18.25" y="11.5" width="1.5" height="9" />
        <rect x="21.25" y="11.5" width="1.5" height="9" />
        <rect x="24.25" y="11.5" width="1.5" height="9" />
      </g>
      <rect
        className="logo-mark-needle"
        x="15.25"
        y="8.5"
        width="1.5"
        height="15"
      />
    </svg>
  );
}
