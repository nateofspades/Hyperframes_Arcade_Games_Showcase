// Canonical seek-safe motion template, embedded by scripts/sync-game-segments.mjs.
// Tokens are replaced at source time; authored HTML remains the editable content.
const tl = gsap.timeline({ paused: true });
tl.fromTo('#__GAME__-line',
  { scaleX: 0, opacity: 0 },
  { scaleX: 1, opacity: 1, duration: .35, ease: 'power3.out' }, .08);
tl.fromTo('#__GAME__-title',
  { y: 18, opacity: 0 },
  { y: 0, opacity: 1, duration: .4, ease: 'power3.out' }, .18);
tl.fromTo('#__GAME__-description',
  { y: 14, opacity: 0 },
  { y: 0, opacity: 1, duration: .45, ease: 'power3.out' }, .3);
tl.fromTo('#__GAME__-stage',
  { opacity: 0 },
  { opacity: 1, duration: .4, ease: 'power2.out' }, .04);
// End before the host's exclusive end. No media playback/seek calls.
tl.to('#__GAME__-description', { y: -10, opacity: 0, duration: .4, ease: 'power2.inOut' }, __DURATION__ - .65);
tl.to('#__GAME__-title', { y: -12, opacity: 0, duration: .4, ease: 'power2.inOut' }, __DURATION__ - .57);
tl.to('#__GAME__-line', { scaleX: 0, opacity: 0, duration: .35, ease: 'power2.inOut' }, __DURATION__ - .49);
tl.to('#__GAME__-stage', { opacity: 0, duration: .4, ease: 'power2.inOut' }, __DURATION__ - .45);
window.__timelines['__GAME__'] = tl;
