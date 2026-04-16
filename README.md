# Moonflower

A multi-experiment gacha platform powered by Wikipedia. Each experiment is a self-contained gacha game that sources its content from the Wikimedia API.

## Architecture

```
src/
├── lib/
│   ├── api/
│   │   └── wiki-api.ts          # Shared Wikimedia API helper
│   ├── components/
│   │   ├── GachaCard.svelte     # Shared card component (flip, reveal, thumbnail)
│   │   ├── ExperimentCard.svelte # Hub page experiment listing
│   │   └── Toast.svelte         # Global toast notifications
│   ├── i18n/
│   │   └── en.ts                # All user-facing strings
│   ├── stores/
│   │   └── toast.svelte.ts      # Toast state
│   ├── experiments.ts           # Central experiment registry
│   ├── types.ts                 # Shared type definitions
│   └── index.ts                 # Barrel exports
├── routes/
│   ├── +layout.svelte           # Root layout (global styles + Toast)
│   ├── +page.svelte             # Experiment hub (homepage)
│   ├── api/
│   │   └── pull/+server.ts      # Shared API endpoint for fetching articles
│   └── example/                 # ← Each experiment gets a directory like this
│       ├── +layout.svelte       # Experiment-scoped layout
│       └── +page.svelte         # Experiment page(s)
```

## How It Works

- **Homepage (`/`)** — Lists all registered experiments
- **Experiment (`/example`)** — Each experiment lives under its own slug
- **Shared API** — All experiments fetch articles via `/api/pull?count=5&sentences=3`
- **Shared components** — `GachaCard` provides the flip/reveal mechanic; experiments extend it via slots

## Creating a New Experiment

1. **Create a route directory** at `src/routes/<your-slug>/`
2. **Add a layout** (`+layout.svelte`) with back navigation:
   ```svelte
   <script lang="ts">
     import { en } from '$lib/i18n/en';
     let { children } = $props();
   </script>

   <div class="flex min-h-dvh flex-col">
     <header class="flex items-center gap-4 border-b-2 border-base-content/20 px-4 py-3">
       <a href="/" class="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
         {en.shared.back}
       </a>
       <span class="text-base-content/20">|</span>
       <h1 class="text-xs font-bold uppercase tracking-[0.3em]">{en.experiments.yourSlug.name}</h1>
     </header>
     <main class="flex-1 overflow-y-auto">{@render children()}</main>
   </div>
   ```
3. **Add your page(s)** (`+page.svelte`) using shared helpers:
   ```svelte
   <script lang="ts">
     import GachaCard from '$lib/components/GachaCard.svelte';
     import type { WikiArticle } from '$lib/types';
     // Fetch via /api/pull and build your mechanic
   </script>
   ```
4. **Register the experiment** in `src/lib/experiments.ts`
5. **Add i18n strings** under `en.experiments.<your-slug>` in `src/lib/i18n/en.ts`

## Tech Stack

- **SvelteKit** with Svelte 5 (runes mode)
- **Tailwind CSS 4** + **DaisyUI 5** (black theme, brutalist aesthetic)
- **Space Mono** font
- **Wikimedia API** for content

## Running Locally

```sh
npm install
npm run dev
```

No environment variables are required. The app fetches directly from the public Wikimedia API.

## Building

```sh
npm run build
npm run preview
```
