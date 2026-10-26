# WorldOps AI — Implementation Plan

**Product:** a browser-based prompt-to-world tool whose flagship demo is a flood-rescue
simulation in a fictional coastal town. Prompt → validated scene → deterministic
simulation → real interventions → natural-language edit → measured outcome.

**Deadline:** 11 Nov 2026, 16:30 CEST. Feature freeze 10 Nov 2026.

## Status (26 Oct 2026)

- **Implemented:** end-to-end browser app, validated scene model and normalizer, atomic
  patch editor, deterministic tick simulation, A* navigation, flood grid, rescue skiffs,
  sandbag barriers, route open/close, flood-gate hold, calculated outcomes, event log,
  procedural 3D town, selection/inspection, guide and failure states, WebGL fallback.
- **Implemented and tested with mocks:** server-side AI generate/edit routes and the
  OpenAI-compatible provider adapter. No live key existed in this environment, so the
  hosted build will use the clearly-labelled Local Demo mode until `LLM_API_KEY` is set.
- **Tested:** 53 automated tests pass; typecheck/lint/build pass; Playwright functional flow
  and 1440×900 visual QA pass. Outcome comparison verified: unassisted 10/12 vs one-skiff
  12/12.
- **Released:** public GitHub repository, Vercel production deployment and a 2:29
  clearly-labelled time-lapse demo video. Public URL QA passed in a clean headless session.
- **Remaining:** live LLM provider verification once an operator supplies `LLM_API_KEY`.

## Stack

- Next.js 15 (App Router) + TypeScript, plain CSS (no UI framework)
- React Three Fiber 9 + Drei + Three.js for a stylized low-poly diorama
- Zustand for canonical plan + runtime simulation state
- Zod for ScenePlan / ScenePatch validation and normalization
- Server-only LLM adapter (OpenAI-compatible Chat Completions, JSON mode), with
  timeouts, bounded retry, rate limiting and a deterministic local mode
- Vitest for pure logic tests; Playwright for end-to-end browser QA
- Vercel for the hosted demo

## Core decisions

1. **AI proposes, code disposes.** The model emits JSON only. The server validates and
   normalizes it; the client never executes model code. Simulation outcomes are always
   computed from runtime state by `metrics.ts`.
2. **Flood evacuation is the one supported ruleset.** Prompts are adapted to it and the
   UI says so. This keeps quality high instead of pretending to be a general engine.
3. **Deterministic simulation.** Fixed ticks (no random numbers, no frame-rate coupling).
   Navigation uses an A* grid derived from roads, building footprints, terrain elevation
   and flood state. Residents re-path every tick; flooded cells strand agents; boats can
   rescue them.
4. **Three real interventions:** dispatch a rescue skiff, deploy a flood barrier on a
   road, and close/reopen a route. Holding the water rise is a fourth. Each mutates
   runtime state and therefore metrics.
5. **Patches, not resets.** Edits return validated operations; unchanged plan entities keep
   IDs and positions. Runtime state is rebased around the new plan rather than reset.
6. **No key required.** The demo preset and a small deterministic scene composer + edit
   parser make the full experience usable offline. These are labelled `LOCAL` / `BUILT-IN`,
   never presented as an LLM result. The AI path is activated by `LLM_API_KEY` server-side.

## Milestones

1. **M1 — Browser diorama.** App shell, R3F canvas, stylized town, orbit camera, selection.
2. **M2 — Canonical world.** Zod schema, normalizer, flood preset, renderer from plan,
   play/pause/reset skeleton, metrics panel shell.
3. **M3 — Prompt → scene.** Server generate route + provider adapter + prompt UI + loading,
   error, fallback and local-mode states.
4. **M4 — Simulation.** Terrain/elevation, flood grid, A* navigation, agents, shelters,
   boats, deterministic ticks, event log, calculated outcomes.
5. **M5 — Interventions.** Skiff dispatch, sandbag barrier, route close/reopen, water hold;
   action-to-outcome tests.
6. **M6 — NL editing.** Edit route + patch schema + atomic patcher + local edit parser;
   preserve untouched entities; live rebase of the simulation.
7. **M7 — Polish and release.** Failure states, onboarding, responsive layout, browser QA,
   screenshots, README, licenses, deployment, demo video, submission copy.

## Verification gates

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` after each milestone.
- Browser QA via Playwright at 1440×900 and 1280×800, including a full demo run.
- Action→outcome tests must assert metric changes, not just button state.
- Final check on the public URL in a fresh browser profile.
