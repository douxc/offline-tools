type LogoMarkProps = {
  className?: string;
};

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
        rx="9.5"
      />
      <path
        className="logo-mark-path"
        d="M10.5 9.5V19.25C10.5 21.0449 11.9551 22.5 13.75 22.5H22.5"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        className="logo-mark-accent"
        x="18.25"
        y="9.5"
        width="4.25"
        height="4.25"
        rx="1.25"
      />
    </svg>
  );
}
