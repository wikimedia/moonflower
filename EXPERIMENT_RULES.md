# Moonflower Experiment Rules

Follow these rules when creating a new gacha experiment for the Moonflower platform. These rules apply to all AI agents and human contributors.

## Core Principles

1. **Each experiment is self-contained.** All experiment-specific code lives under `src/routes/<slug>/`. Never modify another experiment's files.

2. **Use shared helpers, not custom API calls.** Fetch Wikipedia articles via the shared `/api/pull` endpoint or import `fetchRandomArticles` from `$lib/api/wiki-api.ts` for server-side use. Do not make direct Wikimedia API calls from experiment code.

3. **Use shared components.** Use `GachaCard` from `$lib/components/GachaCard.svelte` for card rendering. Extend it via the `actions` snippet slot — do not fork or duplicate it.

4. **No hardcoded strings.** Every user-facing string must go in `src/lib/i18n/en.ts` under `en.experiments.<your-slug>`. Reference all strings via the `en` import, never as inline string literals.

5. **No persistence backends.** The platform uses no database. All state is local/ephemeral. Do not add Firebase, Supabase, or any other persistence layer.

## File Structure

When creating experiment `my-idea`:

```
src/routes/my-idea/
├── +layout.svelte      # Required: experiment layout with back nav
├── +page.svelte        # Required: main experiment page
├── settings/           # Optional: sub-routes
│   └── +page.svelte
└── components/         # Optional: experiment-specific components
    └── MyWidget.svelte
```

## Registration Checklist

Every new experiment requires these three steps:

1. **Add i18n strings** to `src/lib/i18n/en.ts`:
   ```typescript
   experiments: {
     myIdea: {
       name: 'MY IDEA',
       description: 'A brief description of what this experiment explores.'
       // Add any experiment-specific strings here
     }
   }
   ```

2. **Register in `src/lib/experiments.ts`**:
   ```typescript
   {
     slug: 'my-idea',
     name: en.experiments.myIdea.name,
     description: en.experiments.myIdea.description,
     color: '#a78bfa' // Pick a unique accent color
   }
   ```

3. **Create your route directory** at `src/routes/my-idea/`

## Layout Requirements

Every experiment layout **must** include:
- A back button linking to `/` (the hub)
- The experiment name in the header
- Use `en.shared.back` for the back button text

```svelte
<header class="flex items-center gap-4 border-b-2 border-base-content/20 px-4 py-3">
  <a href="/" class="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
    {en.shared.back}
  </a>
  <span class="text-base-content/20">|</span>
  <h1 class="text-xs font-bold uppercase tracking-[0.3em]">{en.experiments.myIdea.name}</h1>
</header>
```

## Styling Rules

- **Use DaisyUI components** (`btn`, `card`, `badge`, etc.) — do not write custom CSS for things DaisyUI handles.
- **Use the `hover-3d` wrapper** for cards. Wrap card content in a `div.hover-3d` and add 8 empty `<div></div>` siblings after the content for the 3D tilt effect. See `GachaCard.svelte` for the reference pattern.
- **Follow the brutalist aesthetic**: all border-radius is forced to 0, use `Space Mono` font, use heavy tracking on headers.
- **Use Tailwind utility classes** — avoid `<style>` blocks unless absolutely necessary.
- **Stick to the `black` DaisyUI theme** and use `base-content`, `base-200`, `primary`, `neutral` tokens for colors.

## API Usage

Fetch articles from the shared endpoint:

```typescript
const res = await fetch('/api/pull?count=5&sentences=3');
const articles: WikiArticle[] = await res.json();
```

Query parameters:
- `count` — number of articles (1–20, default 5)
- `sentences` — intro sentences per article (1–10, default 3)

## Do NOT

- ❌ Modify shared files in `src/lib/` without team discussion
- ❌ Add npm dependencies without team approval
- ❌ Add any authentication or user account system
- ❌ Add any database or external persistence
- ❌ Hardcode user-facing strings — always use `en.ts`
- ❌ Modify another experiment's route directory
- ❌ Use inline styles for layout — use Tailwind classes
- ❌ Remove or modify the root layout or global CSS
