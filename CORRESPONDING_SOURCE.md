# Corresponding source for the image-compression bundle

The browser downloads `/assets/image-compress-worker.js`, which contains the
libimagequant and OxiPNG WebAssembly modules. This repository contains the
preferred source form and exact build instructions for that object code.

## Rebuild the distributed worker

Use Node.js `>=22.13.0` and the pnpm version declared in `package.json`:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build:image-codecs
```

The command bundles these inputs into the ignored generated file
`public/assets/image-compress-worker.js`:

- `src/workers/image-compress-worker.ts`
- `src/lib/png-strategy.ts`
- `scripts/build-image-codecs.mjs`
- the exact packages pinned by `pnpm-lock.yaml`

`pnpm build` copies the generated worker into the static `dist` application.
No private keys, deployment credentials, or server environment are needed.

## Exact upstream source

| Distributed package | Published source | Compiled core |
| --- | --- | --- |
| `libimagequant-wasm@0.3.0` | [`c33b7f493c879dd0d183dc41c098dec7f501ebb7`](https://github.com/akshetpandey/libimagequant-wasm/tree/c33b7f493c879dd0d183dc41c098dec7f501ebb7) | `imagequant@4.4.1` |
| `@jsquash/oxipng@2.3.0` | [`68a7201e5b4d9703bf65670fb0284d16536dd145`](https://github.com/jamsinclair/jSquash/tree/68a7201e5b4d9703bf65670fb0284d16536dd145/packages/oxipng) | `oxipng@9.1.1` |

The upstream Cargo lockfiles at those commits pin their transitive Rust crates.
See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for copyright and
license details.
