# WorldOps Studio v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current card-heavy dashboard with a minimal Spline-style 3D studio, a Tripo-style generation/version workflow, and a dedicated Run mode.

**Architecture:** Keep the canonical store, deterministic simulation, AI routes and procedural scene. Add studio view state and version snapshots to the store; add a new `components/studio/*` shell; reuse `WorldCanvas`, `BuildController`, `Toast` and the scene primitives. The old UI stays unused on `studio-v2`; production stays on `main`.

**Tech Stack:** Next.js 15, React 19, TypeScript, React Three Fiber, Drei, Zustand, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-26-worldops-studio-v2-design.md`

## Global Constraints

- Work only on branch `studio-v2`; do not merge/deploy to production until the preview is approved.
- Do not break the existing simulation/engine/AI routes; all 58 existing tests must keep passing.
- No new runtime UI libraries. Reuse existing icons; add only small local SVG icons if needed.
- No serif font, no paper panels, no numbered kicker labels, no permanent outcome card or event log.
- AI key remains server-side; the preview must use Vercel environment variables, not a committed key.
- Every commit should keep typecheck and tests green unless noted.

---

### Task 1: Studio state + version history

**Files:**
- Create: `lib/studio.ts`
- Modify: `lib/types.ts`
- Modify: `lib/store.ts`
- Test: `tests/studio-version.test.ts`

**Interfaces:**
- Produces:
  - `StudioVersionSource = "example" | "ai" | "local" | "manual" | "restore"`
  - `StudioVersion = { id: string; label: string; summary: string; plan: ScenePlan; source: StudioVersionSource }`
  - `StudioView = "welcome" | "build" | "run"`, `StudioLeftTab = "agent" | "layers"`
  - `makeVersion(plan, label, summary, source, id?): StudioVersion`
  - `appendVersion(versions, version, limit?): StudioVersion[]`
- Store additions: `view`, `leftTab`, `versions`, `currentVersionId`, `setView`, `setLeftTab`, `restoreVersion`.
- Version creation inside `loadPlan`, `applyEdit`, `applyLocalOperations`.

- [ ] Write tests for version immutability, label/summary, and 24-version cap.
- [ ] Run new test and verify it fails before implementation.
- [ ] Implement `lib/studio.ts` and store fields/actions.
- [ ] Run `npx vitest run tests/studio-version.test.ts` and full suite.
- [ ] Typecheck and commit.

### Task 2: Minimal shell + Welcome

**Files:**
- Create: `components/studio/StudioApp.tsx`, `StudioHeader.tsx`, `WelcomeView.tsx`
- Create: `app/studio.css`
- Modify: `app/page.tsx`, `app/layout.tsx`
- Reuse: `WorldCanvas`, `Toast`, `GuideModal`

- [ ] Build the full-bleed shell with 52px header, stage, welcome overlay and dark tokens.
- [ ] Header: brand, world title/version in Build/Run; Build/Run switch; DeepSeek status; New world; Guide.
- [ ] Welcome: prompt, examples, Generate, Open Rising Tide, progress/error, disclaimer.
- [ ] Wire `generate`/`loadDemo` to enter Build; New world opens Welcome.
- [ ] Verify in browser at 1440×900 and 1280×800; no old panel/card styles visible.
- [ ] Commit.

### Task 3: Agent/Layers sidebar + versions

**Files:**
- Create: `components/studio/AgentPanel.tsx`, `LayersPanel.tsx`, `VersionList.tsx`
- Modify: `StudioApp.tsx`, `app/studio.css`

- [ ] Agent tab: edit prompt, suggestions, apply button, AI/local mode, errors, recent versions/restore.
- [ ] Layers tab: grouped object/agent list, select/focus, status dots, count.
- [ ] Versions show current label, summary and source; restore resets runtime and returns to Build.
- [ ] Browser test: select from layers, restore a version, AI edit creates a version.
- [ ] Commit.

### Task 4: Tool rail + contextual Inspector

**Files:**
- Create: `components/studio/ToolRail.tsx`, `StudioInspector.tsx`
- Modify: `StudioApp.tsx`, `app/studio.css`
- Reuse: existing store actions (`setPlacementTool`, `rotateSelected`, `deleteSelected`, `duplicateSelected`, `dispatchBoat`, `deployBarrier`, `toggleRoute`)

- [ ] Tool rail: Select, Place flyout, Move (click ground), Rotate, Delete; disabled states; Esc cancels.
- [ ] Inspector only when selection exists; resident/road/boat/shelter/object-specific actions.
- [ ] Place/Move use existing `BuildController`; selected labels only.
- [ ] Browser test: place a house/shelter, move, rotate, duplicate, delete, dispatch a skiff.
- [ ] Commit.

### Task 5: Run mode

**Files:**
- Create: `components/studio/RunBar.tsx`, `RunDrawer.tsx`
- Modify: `StudioApp.tsx`, `StudioHeader.tsx`, `app/studio.css`

- [ ] Build↔Run transitions: Run starts/resumes simulation; Build pauses.
- [ ] Hide left panel/tool rail in Run; keep canvas + contextual inspector.
- [ ] Bottom outcome strip with safe/target, at risk, routes, skiffs, water, tick, speed/reset.
- [ ] Drawers for At risk (with skiff), Routes (select/close/barrier), Events, final outcome.
- [ ] Browser test: run to causeway flood, dispatch skiff, see 12/12; reset; back to Build.
- [ ] Commit.

### Task 6: Scene label restraint

**Files:**
- Modify: `components/world/Buildings.tsx`, `Actors.tsx`, `WorldMarkers.tsx`, `app/studio.css`

- [ ] Remove always-on shelter/dock/causeway/north/surge labels; retain beacons, selected labels and danger markers.
- [ ] Add route access in Run drawer/Layers to compensate for the removed causeway label.
- [ ] Verify the scene reads cleanly at 1440 and 1280; no overlapping labels.
- [ ] Commit.

### Task 7: QA + preview deployment

**Files:**
- Modify: `README.md`, `TASKS.md` (v2 notes)
- Add: screenshots in `docs/`

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- [ ] Playwright QA: Welcome → Generate (live) → Build → edit → version restore → place → Run → rescue → outcome → back.
- [ ] Capture `docs/v2-welcome.png`, `docs/v2-build.png`, `docs/v2-run.png`.
- [ ] Deploy Vercel preview (no `--prod`); add AI env vars to Preview scope if needed.
- [ ] Report preview URL/screenshots; do not merge production until approval.
