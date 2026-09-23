# Art assets

The pixel art comes from two paid packs by LimeZu:

- [Modern Interiors](https://limezu.itch.io/moderninteriors) for the characters
- [Modern Office Revamped](https://limezu.itch.io/modernoffice) for the office tiles

Both licences allow using and editing the art in this project, commercial or
not, and both forbid redistributing the art itself. A public git repository
counts as redistributing, so these files are **not** in this repository:

```
frontend-nextjs/public/characters/*.png
frontend-nextjs/public/tilesets/textures/*.png
frontend-nextjs/public/tilesets/items/*.png
```

The map (`tilesets/office-map.tmj`) and the pictures rendered from it
(`floor.webp` and the social cards in `og/`, drawn by
`frontend-nextjs/scripts/pictures.mjs`) are our own work and stay in the
repository.

## How a build gets them

`frontend-nextjs/assets.manifest.json` lists every file with its size and
SHA-256. `pnpm assets`, which also runs before `dev` and every build, puts them
into `public/` and checks each one against that manifest.

It takes them from `private-assets/` when that folder exists, and otherwise
downloads them from the R2 bucket's public URL. Neither needs credentials, so a
working copy and CI both build without a copy of the packs.

`pnpm assets --remote` ignores the local copy and downloads everything, which is
how to check that a build elsewhere will work.

## Running it yourself

If you have bought both packs, put your copies in `private-assets/`, matching
the layout in the manifest, and everything works offline. The folder is
ignored by git.

Without the packs you can still run everything else; only the office floor and
the characters will be missing.

## Deploying

Nothing to configure: the bucket serves these files at the public URL recorded
in the manifest, and the files are the same ones the site serves anyway.

To close the bucket instead, run `wrangler r2 bucket dev-url disable tinyfloor`,
drop `publicUrl` from the manifest, and give the build these variables from an
R2 API token with read access:

| Variable | Meaning |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | R2 API token key id |
| `R2_SECRET_ACCESS_KEY` | the matching secret |
| `R2_BUCKET` | optional, defaults to `tinyfloor` |

Uploading a changed file: `wrangler r2 object put tinyfloor/<key> --file=<path>
--remote`, then update the manifest entry's size and SHA-256.

## Regenerating a character

`tools/buildcharacters.py Ash Dan` builds a character atlas from the Modern
Interiors sheets: 24 idle frames, 24 run frames and a seated pose per
direction. Point `MODERN_INTERIORS` at your copy of the pack if it is not in
the default location.

## Credit

The Modern Interiors licence requires credit to
[LimeZu](https://limezu.itch.io), and the Modern Office licence welcomes it. The
credit is served at `/credits.txt`, from `frontend-nextjs/public/credits.txt`.
