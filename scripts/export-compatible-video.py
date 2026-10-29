#!/usr/bin/env python3
"""Normalize a repaired intermediate into one browser-compatible H.264 stream.

Never stream-copy a lossless repair island into an avc1 delivery. Even yuv420p
lossless x264 requires profile 244, which is not the ordinary High profile 100.
Re-encode video once, at near-lossless QP 1; copy AAC and its timestamps exactly.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)
    ]))


def check_headers(path):
    """Inspect in-band SPS too: ffprobe's initial stream profile is insufficient."""
    run = subprocess.run([
        'ffmpeg', '-v', 'info', '-i', str(path), '-map', '0:v:0', '-an',
        '-c:v', 'copy', '-bsf:v', 'trace_headers', '-f', 'null', '-'
    ], capture_output=True, text=True, check=True)
    profiles = set(map(int, re.findall(r'\bprofile_idc\s+[01]+\s+=\s+(\d+)', run.stderr)))
    levels = set(map(int, re.findall(r'\blevel_idc\s+[01]+\s+=\s+(\d+)', run.stderr)))
    assert profiles == {100}, f'Non-uniform/unsupported in-band H.264 profiles: {profiles}'
    assert levels == {41}, f'Non-uniform H.264 levels: {levels}'
    return {'profile_ids': sorted(profiles), 'level_ids': sorted(levels)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    assert not args.output.exists(), 'Refusing to overwrite an existing video'
    before = probe(args.input)
    video = next(s for s in before['streams'] if s['codec_type'] == 'video')
    assert video['avg_frame_rate'] == '30/1', 'This export preserves the 30 FPS showcase'
    assert video['width'] <= 1920 and video['height'] <= 1080
    audio = [s for s in before['streams'] if s['codec_type'] == 'audio']
    assert all(s['codec_name'] == 'aac' for s in audio), 'Only existing AAC can be copied'
    subprocess.run([
        'ffmpeg', '-v', 'error', '-n', '-i', str(args.input),
        '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-threads', '1',
        '-preset', 'veryfast', '-qp', '1', '-profile:v', 'high', '-level:v', '4.1',
        '-pix_fmt', 'yuv420p', '-r', '30', '-fps_mode', 'cfr',
        '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-bf', '2', '-refs', '3',
        '-color_primaries', video.get('color_primaries', 'bt709'),
        '-color_trc', video.get('color_transfer', 'bt709'),
        '-colorspace', video.get('color_space', 'bt709'),
        '-c:a', 'copy', '-video_track_timescale', '15360', '-movflags', '+faststart',
        str(args.output)
    ], check=True)
    after = probe(args.output)
    result = next(s for s in after['streams'] if s['codec_type'] == 'video')
    for key in ('width', 'height', 'avg_frame_rate', 'nb_frames', 'duration'):
        assert result[key] == video[key], (key, result[key], video[key])
    assert result['profile'] == 'High' and result['pix_fmt'] == 'yuv420p'
    assert after['format']['duration'] == before['format']['duration']
    print(json.dumps({'output': str(args.output), **check_headers(args.output)}, indent=2))


if __name__ == '__main__':
    main()
