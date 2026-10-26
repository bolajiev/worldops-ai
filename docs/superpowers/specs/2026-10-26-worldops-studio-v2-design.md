# WorldOps Studio v2 — Design Spec

**Status:** Approved direction (26 Oct 2026)
**Scope:** A new UI shell and creation workflow for WorldOps AI. The simulation, AI routes, scene model, interventions and procedural renderer stay intact.

## References studied

- **Tripo Studio** — generation is a first-class job; versions/refinements; the viewer is the hero; tools are contextual to the asset.
- **Spline** — full-bleed canvas, left Agent/Layers sidebar, slim tool rail, contextual inspector, Play mode, AI edits become operations in the same file with version history.

We take the **workflow principles**, not their branding or surface layouts.

## Product loop

```text
prompt → generated world version → inspect / run → intervene / edit
      → new version → compare / restore → run again
```

The unique WorldOps layer is the deterministic simulation. Build mode is for making the world; Run mode is for watching and changing its fate.

## Two modes, one canvas

### Build

```text
┌ WorldOps  ·  Rising Tide  ·  v3        Build | Run        ● DeepSeek   New world  ? ┐
│  Agent | Layers          ┌──────────────────────────────┐        Inspector*        │
│  (300px, tabs)           │                              │        (280px only      │
│                          │         3D WORLD             │         when selected) │
│  versions / prompt       │                              │                        │
│                          │                              │                        │
├──────────────────────────┴──────────────────────────────┴────────────────────────┤
│  ▶ Run    Evacuation 0/12   ·   0 at risk   ·   7 routes        Ready             │
└────────────────────────────────────────────────────────────────────────────────────┘
```

* A slim floating tool rail sits on the canvas edge: Select, Place (flyout), Move, Rotate, Delete.
* No permanent outcome card. The bottom transport shows a compact objective/risk summary.
* The Inspector is absent until something is selected.
* The left panel has two tabs: **Agent** (edit prompt, generation/status, versions) and **Layers** (scene tree).

### Run

- Editor chrome disappears.
- Full-screen world.
- Minimal top bar: back to Build, world title, pause/resume, reset, speed.
- Bottom outcome strip: safe/target with progress, at risk, routes, skiffs, water, tick.
- Expandable drawers above the strip for **At risk**, **Routes**, **Events** and final outcome.
- Selecting a resident, road or shelter opens the same contextual Inspector.
- No permanent event log or giant metrics card.

### Welcome

- The app opens on a prompt-first screen over a dimmed live example world.
- One large prompt, examples as text links, **Generate** primary, **Open Rising Tide example** secondary.
- While generating: a single job row with progress, not a blocking page.
- On success it transitions to Build with a new version.
- On failure it stays on Welcome with a retry and the labelled built-in fallback.

## Interaction rules

- **One command surface per mode.** Welcome: create a world. Build: Agent edits the current world. Run: intervene through selection/drawers. No duplicate prompt boxes.
- **Progressive disclosure.** Panels appear because of selection or an explicit mode; never all at once by default.
- **Direct manipulation.** Click selects, double-click focuses, Place adds objects on the ground, Move clicks a new ground position, Rotate is a direct action, Delete removes. Keyboard: Esc cancels the current tool; Space toggles play/pause outside inputs.
- **Versions are visible.** Every AI generation, AI edit, and manual plan change creates a version. Restoring a version resets the runtime simulation and returns to Build.
- **AI is integrated.** DeepSeek Flash is a small status, not a giant marketing card. The active edit prompt shows whether the response is AI or the labelled local parser.
- **Failure is plain.** Errors are one or two lines with a retry; no stack traces or invented outcomes.

## State model

Add to the canonical store:

```ts
type StudioView = "welcome" | "build" | "run";
type StudioLeftTab = "agent" | "layers";

type StudioVersionSource = "example" | "ai" | "local" | "manual" | "restore";

type StudioVersion = {
  id: string;
  label: string;       // "v3"
  summary: string;     // app-derived, e.g. "Added West Shelter · 12 residents rerouted"
  plan: ScenePlan;     // deep snapshot
  source: StudioVersionSource;
  current?: never;      // current is tracked by currentVersionId
};

type StudioState = {
  view: StudioView;
  leftTab: StudioLeftTab;
  versions: StudioVersion[];
  currentVersionId: string | null;
};
```

Actions: `setView`, `setLeftTab`, `restoreVersion(id)`, plus version creation inside `loadPlan`, `applyEdit`, and `applyLocalOperations`. Versions are capped at 24; the current version is always retained.

Boat dispatch, barriers, flood-gate hold and route toggles are **runtime interventions**, not versions. Plan-changing route status via AI/manual patches creates a version through the normal patch path.

## Visual system

**Direction:** neutral dark "studio chrome" around a vivid illuminated diorama. No paper, no serif display, no numbered labels, no decorative cards, no gradients on panels, no 8-button grids.

| Token | Value |
| --- | --- |
| app background | `#07080a` |
| stage | `#0a0c0f` |
| panel/bar surface | `rgba(16, 18, 22, 0.86)` |
| raised surface | `#14171c` |
| line | `rgba(255, 255, 255, 0.08)` |
| line strong | `rgba(255, 255, 255, 0.16)` |
| text | `#f1f3f1` |
| muted | `#90979b` |
| faint | `#5e666b` |
| accent | `#ff7657` (flood coral) |
| teal | `#67d6c5` |
| safe | `#9ad9a4` |
| danger | `#ff6b5f` |

- Type: **Manrope** for UI, **IBM Plex Mono** for IDs/ticks/version numbers. No serif.
- Sizes: 12–14px UI, 11px metadata, 20–26px page/base headings; no 30–50px dashboard numbers.
- Radii: 6px panels, 5px buttons; 1px borders; minimal shadows.
- Icons: line icons only, 14–16px.
- Spacing: 12px panel padding; 8px rhythm.
- Motion: panel reveal/fade only; no ambient decoration.

## Scene restraint

- Remove always-on 3D labels for shelters, dock, causeway, north and surge. Keep selected-object labels and the danger marker.
- Shelters keep their beacon; shelters/dock are discoverable via the Layers panel, Inspector and Run drawers.
- Keep the compass/flood-origin as silent 3D markers, without permanent HTML text.
- Do not add new asset/download dependencies. The current procedural kit is the visual language; the cleanup is about composition, not realism.
- The example scene remains the hero; no new decorative object count.

## Non-goals

- No material editor, mesh sculpting, timeline, code tab, texture generation, rigging or asset marketplace.
- No multiplayer, accounts, persistence, voice or VR headset mode.
- No arbitrary AI code or meshes.
- No cloning of Tripo/Spline branding or exact layouts.

## Acceptance

1. First visit shows a clean prompt-first Welcome; the example is one click away.
2. Build shows only left Agent/Layers, canvas, tool rail when relevant, and Inspector only on selection.
3. A real DeepSeek generation and edit both work; versions appear and can be restored.
4. Layers select/focus objects and agents; direct place/move/rotate/delete still work.
5. Run mode hides editor chrome and exposes outcome, events, at-risk, routes and interventions.
6. No permanent outcome card, event log, paper cards, serif headlines or numbered kicker labels.
7. Typecheck, lint, 58+ tests and production build pass.
8. Preview deployed on a Vercel preview URL; production remains untouched until approval.

## Delivery

- Work on branch `studio-v2`.
- Implement in focused commits: state/versions → shell/welcome → panels → toolrail/inspector → run mode → scene cleanup → QA.
- Deploy preview, review screenshots at 1440×900 and 1280×800, then ask for production approval.
