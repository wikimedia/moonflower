# 3-theme spread experiment (Svelte, no Gemini, no React)

## Constraints (from product owner)

- **No Gemini** and **no Gemini (or other) API keys** in this experiment—copy is template- or rule-based only, using data already returned by `/api/pull`.
- **No React**—no nested Vite app, no iframe UI. The shipped experience is **SvelteKit** only.
- **Mary Yann namespace:** supporting code and docs live under **[`maryyann/3themeSpread/`](maryyann/3themeSpread/)** (new folder). This is **not** a second frontend bundle; it holds optional **plain TypeScript** (types, pure helpers) that the route imports.

## Repo rules (still apply)

Moonflower requires a route at **`src/routes/<slug>/`** for the app to serve the experiment ([`.cursor/rules/experiments.mdc`](.cursor/rules/experiments.mdc)). So:

| Location | Purpose |
|----------|---------|
| [`maryyann/3themeSpread/`](maryyann/3themeSpread/) | Types, pure functions (e.g. pick theme index, fill `{title}` / `{lede}` placeholders), `README.md`. **No** user-facing string literals—those stay in [`src/lib/i18n/en.ts`](src/lib/i18n/en.ts) under `en.experiments.threeThemeSpread` (or similar key). |
| [`src/routes/3-theme-spread/`](src/routes/3-theme-spread/) | `+layout.svelte`, `+page.svelte`, `components/*.svelte`—all UI and `fetch('/api/pull?count=3&sentences=3')`. |

URL slug: **`3-theme-spread`** (kebab-case). Import helpers with a stable relative path, e.g. `../../../../maryyann/3themeSpread/spread.ts`, **or** add a tiny Vite `resolve.alias` (e.g. `$maryann/3themeSpread`) in [`vite.config.ts`](vite.config.ts)—only if the team prefers shorter imports; relative paths avoid touching shared config.

## Behavior (same journey as before, different stack)

1. **Pull:** Random theme (headline + three slot labels + template lines from `en`) + three articles from **`/api/pull`**.
2. **Spread:** Three cards, staggered auto-reveal, then tap one to keep (optional **localStorage** + **share**, no rarity/Gemini).
3. **Return** to pull.

## Hub button (main Moonflower page)

The hub renders [`ExperimentCard`](src/lib/components/ExperimentCard.svelte) for each entry in [`getExperiments()`](src/lib/experiments.ts). Each card is a link to `/{experiment.slug}` (same slug string as the route folder).

**Requirement:** The new experiment’s [`experiments.ts`](src/lib/experiments.ts) entry must use **`slug: '3-theme-spread'`** so the hub button goes to **`/3-theme-spread`**, which SvelteKit serves from [`src/routes/3-theme-spread/`](src/routes/3-theme-spread/). No extra hub code is needed unless the slug and folder name diverge (they must not).

Remove the old **`different-themes`** object from the `getExperiments()` array so the hub no longer links to the iframe route.

## Hub copy (i18n)

- Add `en.experiments.threeThemeSpread` (name, description, all experiment UI/theme strings); reference it from the `experiments.ts` entry for name/description.

## Cleanup of the old setup

- Remove **`build:different-themes`** from root [`package.json`](package.json); remove [`scripts/sync-different-themes.mjs`](scripts/sync-different-themes.mjs).
- Remove hub entry and route for **`different-themes`** (iframe experiment); delete [`src/routes/different-themes/`](src/routes/different-themes/), [`static/maryyann/`](static/maryyann/), and [`maryyann/different themes/`](maryyann/different%20themes/) so nothing in the tree references Gemini or the old React build.
- Drop `differentThemes` blocks from [`en.ts`](src/lib/i18n/en.ts) once unused.

## Verification

- Grep: no `GEMINI`, `gemini`, `VITE_GEMINI`, `react`, or `maryyann/different` in the new experiment path.
- `npm run build` does not build any subfolder under `maryyann/`.
- Manual: on hub, click the **3 theme** experiment card → lands on **`/3-theme-spread`** (not `/different-themes`) → pull → spread → pick → repeat; toasts on failure.

## Todos

- [ ] Create `maryyann/3themeSpread/` (README + pure TS helpers, no strings).
- [ ] Add `src/routes/3-theme-spread/` (+layout, +page, components), wire `/api/pull`, no Gemini.
- [ ] Expand `en.experiments.threeThemeSpread`; register in `experiments.ts` with `slug: '3-theme-spread'` so the hub `ExperimentCard` links to `/3-theme-spread`.
- [ ] Remove different-themes route, static `maryyann` bundle, `maryyann/different themes`, sync script, and `build:different-themes` script.
- [ ] `npm run check` / `npm run build` / lint.
