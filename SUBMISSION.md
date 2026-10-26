# WorldOps AI — Hackathon Submission Pack

**Competition:** Victoria VR AI Builder Hackathon 2026
**Deadline:** 11 November 2026, 16:30 CEST (15:30 WAT)
**Chosen focus category:** Prompt-to-World Creation
**Project:** WorldOps AI — prompt a world. Change its fate.

---

## Submission links

| Item | Link |
| --- | --- |
| Public source repository | https://github.com/bolajiev/worldops-ai |
| Hosted browser demo | https://worldops-ai.vercel.app |
| Demo video (2:11) | https://worldops-ai.vercel.app/worldops-demo.mp4 |
| Written description | This file / submitted form copy below |

> **AI live:** the hosted demo now uses **DeepSeek V4.1 Flash via OpenCode Go**. The API
> key lives only in server-side deployment environment variables and is never exposed to
> the browser. The built-in scene remains a clearly-labelled fallback if the provider is
> unavailable. Remove or rotate the demo key after judging.

---

## Short written description (submission form copy)

**WorldOps AI turns a plain-language brief into a 3D world with working logic — then lets
you change its fate.**

Most AI scene generators stop at a static image. WorldOps generates a validated scene plan,
renders it as a playable low-poly coastal town, and runs a deterministic flood-evacuation
simulation underneath. Residents choose shelters and re-path on a real navigation grid;
rising water cuts roads; slow residents get stranded. The user can dispatch limited rescue
skiffs, deploy sandbags, close routes, hold the flood gate, and edit the existing world in
natural language. Every outcome — safe residents, people in danger, routes open, resources
used — is calculated from simulation state, never written by the AI.

DeepSeek V4.1 Flash does the creative work: it proposes the `ScenePlan` or a constrained
patch. Zod validation, normalization and an atomic patcher decide whether that proposal is
allowed. A fixed-tick engine runs the actual world. The flagship run fails 10/12 without
intervention and reaches 12/12 with one well-timed rescue, proving that user actions move the
result. A labelled local fallback keeps the demo playable without the provider.

**Category:** Prompt-to-World Creation.
**Stack:** Next.js, TypeScript, React Three Fiber, Three.js, Zustand, Zod, Vitest, Playwright, Vercel.
**Disclaimer:** Experimental educational simulation; not validated for real-world emergency response.

---

## Problem / opportunity

AI creation tools are excellent at generating *content* and weak at generating *systems*.
A generated 3D environment is often a photograph you can orbit — no rules, no goals and no
consequences. WorldOps explores a different pattern: **AI proposes a structured world, and
deterministic software runs it.** That separation makes the result testable, reproducible and
safe to iterate on. A user can describe a situation, watch it develop, intervene, and then
conversationally reshape the same world without losing what already exists.

The flood-rescue scenario is intentionally small and legible. The interesting product is the
loop: **prompt → world + logic → observation → intervention → changed outcome → edit → rerun.**
Users can also build directly: choose a house, shelter, road, bridge, clinic, school, tree or
resident and click the ground, then rotate, move, duplicate or delete it.

---

## How AI is used

1. **Scene planning.** `/api/generate-scene` asks a server-side OpenAI-compatible model for a
   JSON `ScenePlan` with a fixed schema (objects, agents, objectives, events, simulation
   settings and resource budget). The browser never sees the API key. The model cannot return
   code, HTML or executable properties.
2. **Scene editing.** `/api/edit-scene` sends the current plan and asks for one of eight
   supported patch operations. The application validates the entire patch and applies it
   atomically. Untouched entities keep their IDs and positions.
3. **Validation and fallback.** Zod schemas, normalization and cross-reference checks reject
   bad output. A retry, timeout and built-in fallback keep the experience alive. Local demo
   edits use a deterministic parser, clearly labelled as non-AI.
4. **Not AI.** Navigation, flood propagation, agent decisions, skiff movement, resource counts
   and all outcome metrics are deterministic application code. The LLM never decides the
   result.

Live AI is **implemented and tested with a mocked provider response**; no live key was
available in this environment. See “Verification” below for the exact distinction.

---

## What to try as a judge (2 minutes)

1. Open the hosted demo. The built-in **Rising Tide** world is already staged.
2. Press **Start sim**. Watch the flood HUD and residents move west.
3. Around tick 40 the causeway overtops. Select a resident marked **no dry route** in the
   inspector and press **Skiff** — one skiff can recover both stranded residents.
4. Press **Run again** to reset.
5. Switch to **Edit & build** and enter:
   *“Add a second shelter to the west and reroute residents.”*
   The patch adds one shelter, redirects all 12 residents and updates the object count while
   keeping every original ID. No world reset.
6. Inspect **Old Causeway** (click the CAUSEWAY label in the 3D scene or the critical-route
   row). Deploy a barrier or close/reopen the route.
7. Open **Event log** in the right rail to see simulation events; hover the Guide button for
   the field manual.

Try an unsupported edit such as “spawn a dragon”. The local parser returns a safe 422 with
suggestions instead of crashing or inventing a result.

---

## Demo video script (target 2:20, hard limit 3:00)

| Time | Shot | Narration / action |
| --- | --- | --- |
| 0:00–0:15 | App hero, orbit slowly | “AI can generate a 3D scene. WorldOps generates a world that can actually lose.” |
| 0:15–0:35 | Show console, DeepSeek Flash chip, prompt | “Rising Tide is the example. DeepSeek Flash can write a new one; every plan is validated.” |
| 0:35–1:00 | Simulation running; causeway floods; two residents stranded | “Residents navigate, re-path and get cut off as the flood rises. These outcomes are computed from the simulation, not written by a model.” |
| 1:00–1:20 | Select at-risk resident, dispatch skiff; outcome 12/12 | “One rescue skiff changes the result.” |
| 1:20–1:45 | Reset; Edit & build; place a house; AI edit | “Build directly, or describe a patch. DeepSeek proposes it; Zod validates it; unchanged objects keep their IDs.” |
| 1:45–2:05 | Barrier / route controls, event log | “Close a route, place sandbags, or hold the flood gate. Every action has a visible state change and a measured consequence.” |
| 2:05–2:20 | Guide/disclaimer, outcome, logo | “Prompt a world. Change its fate. WorldOps AI.” |

The submitted video follows this outline with a clearly-labelled time-lapse: the recording
VPS was CPU-constrained, so simulation states are advanced between shots. Every state and
interaction is from the real UI. The hosted demo now uses the real DeepSeek Flash provider;
the built-in fallback is labelled if the provider is unavailable.

---

## Verification summary

Run in this repository:

```bash
npm run typecheck   # pass
npm run lint        # pass, no warnings
npm test            # 58/58 pass
npm run build       # pass
```

Automated coverage includes:

- schema acceptance/rejection, ID uniqueness, finite/bounded positions, dangling references
- normalizer caps, clamping, ID dedupe, label sanitization, defaults
- atomic patch rejection, stable IDs/positions, route updates, last-shelter protection
- A* on open/blocked/flooded/protected bridges and building footprints
- deterministic simulation, water thresholds, danger detection, success/failure, resource limits
- action-to-outcome: one skiff changes 10/12 → 12/12; barrier keeps the causeway passable;
  route closure changes metrics; holding water freezes the level
- metrics matched against a hand-calculated state
- OpenAI-compatible provider parsing, error mapping, fenced JSON extraction
- API routes in local mode, fallback, mocked AI generation and mocked AI edit
- **live public AI:** a real DeepSeek generation produced a validated 13-object plan in
  12.3 s; a real edit added a west shelter and rerouted residents in 10.8 s; the browser UI
  produced “East Tide Fishing Village” from a prompt
- **direct building:** placement succeeded through the click-to-place UI (24 → 25 objects)

Manual/browser checks:

- 1440 × 900 visual QA — no console errors; labels readable; flood and route states visible
- functional browser flow — staged → running → skiff rescue → success → reset → NL edit →
  event log → unsupported edit
- WebGL failure path — 3D view shows a clear fallback; the simulation console stays usable
- API smoke tests with `curl` for health, local generation and local edit

**Verified live AI:** the public deployment reports `aiConfigured: true` and
`model: deepseek-v4.1-flash` via `/api/health`. A real public generation produced a validated
13-object plan in 7.1 s. A live-provider edit test through the same server route added a west
shelter and rerouted residents in 10.8 s. The browser UI also generated a new village
("East Tide Fishing Village", 16 objects) with `AI GENERATED`; direct placement changed the
object count 24 → 25. No console errors.

---

## Assets / licences

All 3D geometry is procedural. No external models, textures, HDRIs or sounds. Fonts
(Space Grotesk, IBM Plex Mono) are SIL Open Font License via Google Fonts. Full library
credits are in `LICENSES.md`. Project code is MIT (`LICENSE`).

Screenshots: `docs/hero.png`, `docs/running.png` — captured from the real app.

---

## Known limitations

- Flood evacuation is the only ruleset; prompts are adapted to it.
- Stylized grid flood and abstract skiff movement, not realistic fluid/boat physics.
- No multi-user, accounts, persistence, VR headset mode or voice input.
- The hosted demo depends on an operator-provided DeepSeek/OpenCode Go key; the local
  fallback is used if that provider or key is unavailable.
- Where the demo video advances the simulation between shots, it is labelled as a time-lapse.
- Experimental educational simulation; not for real-world emergency response.
