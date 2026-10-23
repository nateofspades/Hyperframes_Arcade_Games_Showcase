# Arcade Circuit — original procedural backing

## Deliverable and measured acceptance

- File: `assets/arcade-circuit.wav`
- Duration: **90.000000 seconds**, verified with ffprobe.
- Format: **48,000 Hz stereo, 24-bit PCM WAV**.
- Integrated loudness: **−14.65 LUFS** (independent final-file FFmpeg loudnorm analysis, `input_i`).
- True peak: **−1.04 dBTP** (final-file analysis, `input_tp`), below the requested −1 dBTP ceiling.
- Loudness range: **2.8 LU**.
- Tempo: **120 BPM**, a half-second quarter-note grid.

## Provenance

Created for this project with the user's explicit authorization for original procedural backing. The editable score and synthesizer are `scripts/music.js`. All melody note sequences, voicings, arrangement choices, bass lines, rhythmic patterns, and synthesis code were authored for this track. No existing commercial/game tune was intentionally quoted, transcribed or sampled. No external samples, soundfonts, music services, model weights, vocals, lyrics, or downloaded audio were used. No claim of a comprehensive similarity search is made.

Every audio signal is generated locally from mathematical sine/triangle oscillators and seeded xorshift noise (`0x451ab321`). Node built-ins perform synthesis and WAV encoding; FFmpeg performs two-pass loudness normalization. No paid services, publishing, uploads, or feedback submissions are involved.

## Score and arrangement

Instrumental synthwave/chiptune hybrid with four newly authored melodic motifs, phrase variation, register changes and breathing space. Recurring Am/F/C/G harmony, sustained detuned pads, eighth-note bass, sixteenth-note stereo arpeggios, synthesized kick/snare/hi-hats and noise cymbals. Gentle saturation and dotted-eighth cross-delay blend the voices.

- 0–5 s: pad introduction and staggered arp, bass and drum buildup.
- 5–83 s: changing phrase energy and lead/register variations.
- Scene-cut accents at **5, 14, 23, 32, 41, 50, 59, 68, 83 s**, all exact 0.5-second beat positions.
- 83–86 s: melodic turnaround.
- 86–90 s: A-minor resolution with four-second cosine-shaped master fade to silence.

## Reproduce or edit

From the project directory:

```sh
node scripts/music.js
```

Requires Node.js (ES modules), ffmpeg and ffprobe on PATH; no npm dependencies. Edit `motifs`, `chords`, bass values, instrument synthesis, gains and `cuts` inside the generator. Stereo synthesis uses two Float32Array buffers and one-second PCM write blocks. Each FFmpeg process is constrained to one codec thread and one filter thread. Runs locally without starting a browser or model. The generator writes intermediate mastering evidence, checks final loudness acceptance, and deletes its temporary premaster after success.

On this shared resource-limited VPS the complete foreground run exceeded the tool's 420-second deadline after synthesis and mastering had completed. Final-file analysis and ffprobe were then executed separately and passed; no audio was fabricated or substituted. Allow several minutes for a full regeneration. A compatibility issue with the project's ES-module package setting was corrected to native imports before successful synthesis. Progress logging was subsequently suppressed without changing synthesis or mastering settings.

## Evidence

- `evidence/music-premaster-loudnorm.txt`: premaster analysis.
- `evidence/music-mastering.txt`: mastering output and normalization statistics.
- `evidence/music-final-loudness.txt`: independent final WAV analysis; use **input** measurements, not hypothetical normalized output fields.
- `evidence/music-ffprobe.json`: exact final stream and format metadata.
- `evidence/music-summary.json`: machine-readable acceptance measurements and cue positions.
- `evidence/music-sha256.txt`: final WAV SHA-256 checksum.

Technical checks do not replace a listening review; no subjective listening assessment is claimed.
