# Third-party materials and licences

WorldOps AI's original code and procedural geometry are released under the MIT licence in
`LICENSE`.

## Runtime and build libraries

| Package | Version | Licence | Source |
| --- | --- | --- | --- |
| next | 15.5.28 | MIT | https://github.com/vercel/next.js |
| react / react-dom | 19.2.9 | MIT | https://github.com/facebook/react |
| three | 0.186.1 | MIT | https://github.com/mrdoob/three.js |
| @react-three/fiber | 9.8.2 | MIT | https://github.com/pmndrs/react-three-fiber |
| @react-three/drei | 10.7.9 | MIT | https://github.com/pmndrs/drei |
| three-stdlib (transitive) | 2.x | MIT | https://github.com/pmndrs/three-stdlib |
| zustand | 5.0.16 | MIT | https://github.com/pmndrs/zustand |
| zod | 4.6.7 | MIT | https://github.com/colinhacks/zod |

## Development and testing

| Package | Version | Licence | Source |
| --- | --- | --- | --- |
| typescript | 5.9.3 | Apache-2.0 | https://github.com/microsoft/TypeScript |
| vitest | 3.2.4 | MIT | https://github.com/vitest-dev/vitest |
| playwright | 1.58.2 | Apache-2.0 | https://github.com/microsoft/playwright |
| eslint | 8.57.1 | MIT | https://github.com/eslint/eslint |
| eslint-config-next | 15.5.28 | MIT | https://github.com/vercel/next.js |
| @types/three | 0.186.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react / @types/react-dom / @types/node | 19.x / 19.x / 24.x | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |

Full licence texts are distributed with each package in `node_modules/<package>/LICENSE`.
The packages are used under their respective licences and no endorsement is implied.

## Fonts

| Font | Licence | Source |
| --- | --- | --- |
| Fraunces | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Fraunces |
| Manrope | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Manrope |
| IBM Plex Mono | SIL Open Font License 1.1 | https://fonts.google.com/specimen/IBM+Plex+Mono |

Fonts are self-hosted at build time by `next/font/google`. No font files are committed to
this repository.

## 3D assets, textures and audio

None. Every house, road, tree, shelter, resident, boat, barrier and water surface is
constructed procedurally at runtime from React Three Fiber primitives. There are no
downloaded models, textures, HDRIs, sprites or sound files.

## AI-generated materials

- **Code and copy:** AI coding assistants were used during implementation under human
  direction. All functionality was reviewed, tested and verified in this repository; the
  human submitter remains responsible for the submission.
- **3D scene content:** the built-in Rising Tide scenario is authored as data in
  `data/flood-rescue-demo.json`; at runtime the user may generate new scene plans with a
  configured LLM. The generated data is validated and rendered through a controlled
  primitive catalog. No model-generated meshes, textures or code are downloaded or
  executed.
- **Screenshots/video:** captured from the running app by the project authors.
- **Runtime AI provider:** DeepSeek V4.1 Flash through OpenCode Go
  (`https://opencode.ai/inference/go/openai/v1`). The API key is server-side and excluded
  from the repository. User prompts and current scene plans are sent to that provider when
  AI generation/editing is used. See https://opencode.ai/docs/go and the provider's privacy
  terms. Remove or rotate the demo key after judging.

## Hackathon and platform marks

"Victoria VR" and "AI Builder Hackathon" are used only to describe participation in the
event. WorldOps AI is an independent project and is not endorsed by or affiliated with
Victoria VR beyond participation in the hackathon.

## Disclaimer

Experimental educational simulation; not validated for real-world emergency response. The
flood model is stylized and deterministic, not a physically accurate disaster model.
