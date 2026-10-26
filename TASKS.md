# WorldOps AI — Tasks

Legend: `[x]` done and verified · `[~]` in progress / partial · `[ ]` not started

## M0 — Groundwork

- [x] Inspect workspace and environment (Node 24, npm 11, Vercel/GitHub auth, Playwright cache)
- [x] Verify official hackathon requirements and deadline against victoriavr.com and T&Cs
- [x] Write implementation plan and task list

## M1 — Browser diorama

- [x] Scaffold Next.js + TypeScript + R3F app
- [x] App shell, brand header, responsive layout, visual system
- [x] Stylized low-poly town: ground, coast, roads, buildings, shelter, trees, canal
- [x] Orbit camera, initial framing, selection affordances
- [x] Typecheck, lint, build pass

## M2 — Canonical world

- [x] ScenePlan + patch Zod schemas
- [x] Normalizer (bounds, IDs, caps, defaults, reference repair)
- [x] Flagship flood-rescue preset JSON
- [x] Renderer driven entirely by canonical plan
- [x] Built-in scenario load/reset; source badges

## M3 — Prompt → scene

- [x] Server `generate-scene` route with validation, size limits, timeout, retry
- [x] OpenAI-compatible provider adapter with server-only key
- [x] Deterministic local edit parser + curated preset fallback
- [x] Prompt panel: examples, loading, errors, fallback, retry, history
- [x] Health endpoint + AI-configured indicator
- [x] Live third-party model call — DeepSeek V4.1 Flash via OpenCode Go, server-side key configured
- [x] Live AI edit — real patch adds a shelter and reroutes residents

## M4 — Simulation

- [x] Elevation model + flood grid
- [x] A* navigation graph from roads/buildings/water/bridge clearances
- [x] Simulation engine: fixed ticks, water rise, events, agent decisions
- [x] Shelter arrival, danger detection, rescue skiffs, event log
- [x] Calculated outcomes/metrics panel
- [x] Play/pause/reset, speed, hold water

## M5 — Interventions

- [x] Dispatch skiff to selected resident (limited resources, visible trip)
- [x] Deploy sandbag barrier on selected road (protects from flood)
- [x] Close/reopen route (re-paths agents)
- [x] Hold/resume flood gate
- [x] Action→outcome automated tests (one skiff 10/12 → 12/12; barrier keeps causeway open)

## M6 — Natural-language editing

- [x] `edit-scene` route + atomic patch application
- [x] Local edit parser with helpful unsupported responses
- [x] Preserve IDs/positions for untouched entities; tests
- [x] Rebase live simulation onto edited plan
- [x] Applied-change summary + event log integration
- [x] Live AI edits — path exercised against DeepSeek V4.1 Flash

## M7 — Polish and release

- [x] Onboarding/guide modal, empty/loading/error states, WebGL fallback
- [x] Selected paths, labels, flood/route visual signals, responsive layout
- [x] Full functional browser QA flow + 1440×900 visual QA screenshots
- [x] README, LICENSES.md, SUBMISSION.md, .env.example, MIT LICENSE
- [x] Public GitHub repo push
- [x] Vercel production deploy + public URL added to submission
- [x] Demo video < 3 minutes recorded from the real app (2:11, time-lapse labelled)
- [x] Final fresh-session QA on the public URL (headless Chromium, WebGL, no console errors)

---

## Verification log

Last run in this environment:

```text
npm run typecheck    PASS
npm run lint         PASS (no warnings)
npm test             PASS — 58/58 tests
npm run build        PASS (Vercel production build also PASS)
```

Browser QA (Playwright, 1440×900 visual + WebGL-disabled functional path):

```text
staged → start → 2 at-risk at causeway flood
one skiff dispatched → 12/12 safe (success)
reset → 0/12, ready
NL edit "Add a second shelter to the west and reroute residents"
→ objects 24 → 25, all 12 residents rerouted, summary displayed
unsupported edit → safe 422 message + suggestions, no crash
WebGL unavailable → 3D fallback shown; console remains usable
```

## Live provider smoke tests

```text
GET https://worldops-ai.vercel.app/api/health
→ aiConfigured: true, model: deepseek-v4.1-flash, mode: ai

POST /api/generate-scene (public)
→ mode: ai, source: AI GENERATED, validated 13-object scene, 5 residents, 7.1 s

POST /api/edit-scene (public)
→ mode: ai, added a west shelter, rerouted residents, 10.8 s

Browser UI
→ prompt “East Tide Fishing Village” → 16 objects, source AI GENERATED, no console errors
→ direct placement: House → ground click, 24 → 25 objects
→ new paper UI, DeepSeek status chip, direct build palette, AI applied summary
```

## Open blockers / credentials

- None for the MVP. The live provider key is configured server-side in Vercel and excluded
  from the repository and client bundle. Rotate or remove the demo key after judging.
- The hosted demo and video are current; the source repo is public.
