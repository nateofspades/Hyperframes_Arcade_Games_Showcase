# GitHub Pages — deployment and original plan

Nathan authorized publication of a webpage with an embedded player and a prominent repository link. The live project-site URL is https://nateofspades.github.io/Hyperframes_Arcade_Games_Showcase/ .

The separate `site/` contains the responsive webpage, authentic poster and gameplay thumbnails. `.github/workflows/pages.yml` deploys only those site files and a checksum-verified copy of the revised MP4 downloaded from the GitHub release. The MP4 is included in the deployment artifact, not Git history. HTML5 controls, inline playback, metadata preloading, direct download and all eight game links are provided; autoplay is off. The repository homepage and top README link point to this page. The editable root composition is never deployed as a website. No video-platform upload is included.

## Original pre-publication assessment (historical)

The following records the earlier plan and approval gate, before the authorization above.

Repository: nateofspades/Hyperframes_Arcade_Games_Showcase (public source repository).

Planned GitHub Pages URL:
https://nateofspades.github.io/Hyperframes_Arcade_Games_Showcase/

The repository name and URL path preserve exact capitalization. Pages must stay disabled until Nathan explicitly authorizes publication. No deployment workflow, CNAME, gh-pages branch or public website is created by this setup. The root index.html is a HyperFrames source composition and must not be deployed as though it were a complete landing page.

## Future publication requirements

- Polished title and concise introduction matching the arcade video's dark neon visual identity.
- Responsive desktop/mobile page, accessible semantic markup and readable typography.
- HTML5 video with controls, a real poster image, playsinline and preload="metadata"; no forced autoplay.
- Approved final video only, with clear credits and a downloadable alternative where appropriate.
- Descriptions and links for all eight games, using the exact verified game paths in README.md.
- Music/asset notices from ASSET_CREDITS.md; review rights again before publication.
- Keep page assets separate from editable HyperFrames compositions. A future site/ build or explicitly selected deployment artifact should use relative paths such as ./assets/poster.jpg, or the exact /Hyperframes_Arcade_Games_Showcase/ base. Avoid domain-root /assets/... paths that would escape a GitHub project-site prefix. Do not alter the video renderer's existing assets/... paths merely to build the separate site.
- Test browser playback, mobile layout, MIME type, poster, seek/range responses, links and deployment URL only when publication is authorized.

## Hosting assessment

The existing final MP4 is 11,661,337 bytes (~11.7 MB decimal), H.264/AAC at 1080p/30 FPS. It fits ordinary Git's per-file limit and is small enough for modest portfolio traffic on Pages. Do not add every render revision to Git; that would grow history without improving editability. The final MP4 is currently outside the repo, so no video site is accidentally deployed.

GitHub documents a 1 GB published-site limit and soft 100 GB/month bandwidth limit. A small approved final MP4 could be included in a future deployment artifact, alongside the poster and page, without shipping production source/caches. Git LFS pointers must not be treated as playable video files on Pages.

For sustained traffic, larger revisions, adaptive streaming or stronger delivery controls, prefer external object storage plus CDN (for example S3-compatible storage or Cloudflare R2) with correct video/mp4 MIME type, byte-range support and suitable CORS/cache policy. A dedicated video service is another later choice, but YouTube or any other platform upload is not authorized now. GitHub Releases may store downloadable versioned binaries later; do not assume release download redirects provide ideal embedded-player streaming. No hosting account or upload is created by this plan.

Current recommendation: keep the reference MP4 outside Git, commit all current editable source/media, and choose deployment-time MP4 hosting after the final edit and publication approval. All required source assets fit ordinary Git; no external source-media storage or Git LFS is needed now.

Sources checked for setup:
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/github/managing-large-files/conditions-for-large-files

Enabling Pages, pushing a site/deployment workflow, or uploading the finished film are separate actions requiring Nathan's request.
