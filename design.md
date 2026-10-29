# Design: Offline Tools

The locked system. Every Hallmark run reads this first; the pages share it. Change it on purpose.

## System

- Genre: atmospheric
- Shape of the first page: Map / Diagram (the home), with an Index hero: the six tools are the first screen and the head sits small above them. The six tools are app screens inside the same shell.
- Theme: Midnight (catalog, deal 1/3)
- Axes: dark / grotesk-sans / cool · posture: committed

## Tokens

`src/tokens.css` is the theme source (Tailwind v4 `@theme` and the scale). `src/index.css` holds the shadcn semantic contract in `:root,.dark` and `.light`, because the project's contrast and token tests read those names. The two must agree.

```css
:root {
  --color-paper: oklch(14% 0.048 264);   --color-paper-2: oklch(18.5% 0.052 264); --color-paper-3: oklch(23% 0.055 264);
  --color-ink: oklch(95% 0.016 250);     --color-ink-2: oklch(88% 0.05 245);      --color-muted: oklch(73% 0.04 256);
  --color-rule: oklch(29% 0.058 264);    --color-rule-2: oklch(40% 0.06 262);
  --color-signal: oklch(80% 0.11 230);   --color-signal-2: oklch(58% 0.10 236);   --color-signal-ink: oklch(16% 0.05 264);
  --color-focus: oklch(84% 0.12 228);
  --font-display: "Mona Sans", "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
  --font-body: var(--font-display);
  --radius-card: 0;  --radius-pill: 0;  --rule-hair: 1px;
  --shadow-card: 0 24px 48px -24px oklch(6% 0.04 264 / 0.7);
}
```

The semantic binding: `--background` = paper · `--foreground` = ink · `--card` = paper-2 · `--popover` = paper-3 · `--primary` = signal · `--primary-foreground` = signal-ink · `--border` = rule · `--ring` = focus. The light theme is derived in `.light` with the same names: cool pale paper, dark ink, the same pale signal and deep signal-2.

Spacing uses the `--step-*` scale (2, 4, 8, 12, 16, 24, 40, 64, 96, 144). The type scale, easings and durations are in `tokens.css`.

## Controls

- Primary: azure fill, dark ink, square, 40px in the app / 48px on the home; no radius.
- Secondary: 1px rule outline, square, same height; hover steps the rule to ink.
- Tabs and group nav: square; the chosen item is an ink fill with paper text.

## Surfaces

paper → paper-2 (wells and panels) → paper-3 (settings); hairline rules part rows and sections. Cards carry no shadow. The A4 preview sheet is paper white (`--sheet`), because it is printed paper, not the page.

## Mark

The O + dial mark: a closed hairline square (O / Offline / the tab) holding seven vertical bars — a radio's tuning scale. The middle bar is taller and azure (the tool in use), the six around it muted (the six tools). 26px in the header, 24px in the footer. `public/logo.svg` and the PWA icons use the same mark on the card tile (`#071129`): the bars `#98a9c1`, the middle `#6bcbf7`, the frame `#1c2a48`; no rounded corners.

## Motion

Calm. One settle on the home hero (opacity 0.6 to 1), from a visible default; no loops; reduced motion ends at once.

## Variants

- Home hero: Index. The h1 at `--text-display-s` over the six-row map; the head carries one primary action to the frame tool (Cut a frame / 切帧), and the tool rows are the index; under 60rem the map becomes a three-column tool grid, two columns on phones, so all six fit the first screen. The hero action dips to 44px on phones so the rows and the map note stay above the ICP bar.
- App screens: the tab rail scrolls inside its own box under 60rem; hidden sibling tool pages stay static (their headers may not stick).
- A4 print: `.a4-sheet` at 210 × 297 mm on `--sheet`; interface and SEO hidden.

## Exports

`src/tokens.css` and `src/index.css` in this project. The semantic names are the contract; the theme names are the material.
