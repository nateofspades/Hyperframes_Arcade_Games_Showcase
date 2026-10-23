# Music, gameplay and third-party notices

## Project media

The footage is genuine captured gameplay from Nathan Burns's eight original browser games, with their live URLs listed in README.md. Stills and the documentation thumbnail/contact sheet were extracted from those captures or the completed reference film. No fabricated screenshots or generated substitute gameplay are used. Original MP4 takes are preserved beside normalized footage and in the untouched source project.

The 90-second Arcade Circuit backing track was procedurally authored for this project. The editable score/synthesizer is scripts/music.js. No external samples, soundfonts, vocals or commercial tune were used. MUSIC.md describes provenance, arrangement and measured loudness; it does not claim a comprehensive musical-similarity search or legal determination. Public repository visibility does not independently grant a blanket license to reuse Nathan's games or media. No new license for all project-owned material is asserted by this setup.

## Third-party software/assets

- GSAP 3.15.0: assets/gsap.min.js retains its original GreenSock copyright/license header. Terms: https://gsap.com/standard-license . This is not relabeled as MIT or Apache. The dependency's package metadata records the same standard license.
- HyperFrames: CLI pinned at 0.8.186; upstream repository https://github.com/heygen-com/hyperframes is Apache-2.0. Retained component templates in compositions/components/ came from its registry (directional-wipe, grid-pixelate-wipe and text-stagger). Include upstream Apache license/notice terms when redistributing those components; upstream license text is preserved in docs/licenses/HyperFrames-LICENSE. Project transitions were adapted from the registry rather than copied from another commercial game.
- Playwright: optional capture tooling dependency, Apache-2.0; npm dependency metadata/license files are supplied by npm ci, not vendored as node_modules.
- Inter and Archivo Black: font families resolved/cached by HyperFrames rather than copied as font binaries into this repository. Review the applicable font distribution license if later vendoring font files or using them on the future website. Their family names are preserved from the original composition.

No paid media-provider credentials or copyrighted commercial music downloads are required to render the present project. Future replacement media and publication still require appropriate rights and attribution review.
