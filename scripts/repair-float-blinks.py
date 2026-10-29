#!/usr/bin/env python3
"""Repair captured empty Float fields, never retime or replace intact frames.

Optional repair-only dependencies: numpy, opencv-python-headless (use a venv).
Example: python repair-float-blinks.py INPUT OUTPUT --region 0,0,474,840
Output is lossless H.264/yuv420p; verify browser decoding before publication.
The original recording and published export must be preserved separately.
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np

cv2.setNumThreads(1)


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)
    ]))['streams'][0]


def interpolate(a, b, fraction):
    """Bidirectional dense-flow warp; preserve motion rather than hold a frame."""
    gray_a = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY)
    gray_b = cv2.cvtColor(b, cv2.COLOR_RGB2GRAY)
    flow = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    forward = flow.calc(gray_a, gray_b, None)
    backward = flow.calc(gray_b, gray_a, None)
    yy, xx = np.mgrid[:a.shape[0], :a.shape[1]].astype(np.float32)
    left = cv2.remap(a, xx - fraction * forward[..., 0],
                     yy - fraction * forward[..., 1], cv2.INTER_CUBIC,
                     borderMode=cv2.BORDER_REPLICATE)
    right = cv2.remap(b, xx - (1 - fraction) * backward[..., 0],
                      yy - (1 - fraction) * backward[..., 1], cv2.INTER_CUBIC,
                      borderMode=cv2.BORDER_REPLICATE)
    return np.clip(left.astype(np.float32) * (1 - fraction) +
                   right.astype(np.float32) * fraction, 0, 255).astype(np.uint8)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--region', required=True, help='even x,y,width,height')
    parser.add_argument('--start', type=int, default=0)
    parser.add_argument('--end', type=int)
    parser.add_argument('--preset', default='medium')
    parser.add_argument('--empty-only', action='store_true',
                        help='Preserve HUD/transition pixels that differ from the empty field')
    parser.add_argument('--bad-frames', type=Path,
                        help='JSON list of absolute frames; otherwise detect empty field')
    args = parser.parse_args()
    assert not args.output.exists(), 'Refusing to overwrite output'
    info = probe(args.input)
    w, h = info['width'], info['height']
    count = int(info['nb_frames'])
    end = args.end if args.end is not None else count
    x, y, rw, rh = map(int, args.region.split(','))
    assert all(v % 2 == 0 for v in (x, y, rw, rh))
    assert 0 <= x < x + rw <= w and 0 <= y < y + rh <= h
    size = w * h * 3 // 2
    decode = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-i', str(args.input), '-vf',
        f'trim=start_frame={args.start}:end_frame={end},setpts=PTS-STARTPTS',
        '-fps_mode', 'passthrough', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'
    ], stdout=subprocess.PIPE)
    # Keep large scratch buffers outside the project: HyperFrames scans assets.
    work = tempfile.TemporaryDirectory(prefix='float-repair-')
    raw_path = Path(work.name) / 'frames.yuv'
    fields_path = Path(work.name) / 'fields.rgb'
    frames = np.memmap(raw_path, dtype=np.uint8, mode='w+', shape=(end - args.start, size))
    decoded = 0
    while True:
        data = decode.stdout.read(size)
        if not data:
            break
        assert len(data) == size
        frames[decoded] = np.frombuffer(data, dtype=np.uint8)
        decoded += 1
    assert decode.wait() == 0 and decoded == end - args.start
    fields = np.memmap(fields_path, dtype=np.uint8, mode='w+',
                       shape=(len(frames), rh, rw, 3))
    for n, frame in enumerate(frames):
        rgb = cv2.cvtColor(frame.reshape(h * 3 // 2, w), cv2.COLOR_YUV2RGB_I420)
        fields[n] = rgb[y:y + rh, x:x + rw]
    if args.bad_frames:
        bad = [n - args.start for n in json.loads(args.bad_frames.read_text())
               if args.start <= n < end]
    else:
        # Empty captures have a uniform purple field below the transparent HUD.
        bad = [n for n, field in enumerate(fields)
               if field[rh // 8:rh * 7 // 8, rw // 8:rw * 7 // 8].std(axis=(0, 1)).max() < 3]
    assert bad, 'No damaged frames detected; refusing unnecessary encode'
    bad_set = set(bad)
    for n in bad:
        lo = n - 1
        while lo in bad_set:
            lo -= 1
        hi = n + 1
        while hi in bad_set:
            hi += 1
        if lo < 0:
            repaired = fields[hi]
        elif hi >= len(fields):
            repaired = fields[lo]
        else:
            assert hi - lo <= 4, 'Long gap requires separate review'
            repaired = interpolate(fields[lo], fields[hi], (n - lo) / (hi - lo))
        repaired = repaired.copy()
        if args.empty_only:
            # Keep the actual HUD and transition pixels, not interpolated text.
            empty_colour = np.median(fields[n][rh // 3:rh // 2, rw // 3:rw // 2], axis=(0, 1))
            foreground = np.max(np.abs(fields[n].astype(float) - empty_colour), axis=2) > 6
            repaired[foreground] = fields[n][foreground]
        patch = cv2.cvtColor(repaired, cv2.COLOR_RGB2YUV_I420).reshape(-1)
        frame = frames[n]
        # Replace only the gameplay rectangle, directly in planar YUV. Pixels
        # elsewhere never pass through a colour conversion.
        for offset, stride, px, py, pw, ph, data in [
            (0, w, x, y, rw, rh, patch[:rw * rh]),
            (w * h, w // 2, x // 2, y // 2, rw // 2, rh // 2,
             patch[rw * rh:rw * rh * 5 // 4]),
            (w * h * 5 // 4, w // 2, x // 2, y // 2, rw // 2, rh // 2,
             patch[rw * rh * 5 // 4:])
        ]:
            plane = frame[offset:offset + stride * (h if offset == 0 else h // 2)]
            target = plane.reshape(-1, stride)[py:py + ph, px:px + pw]
            if args.empty_only:
                protected = foreground if offset == 0 else foreground.reshape(rh // 2, 2, rw // 2, 2).any(axis=(1, 3))
                target[~protected] = data.reshape(ph, pw)[~protected]
            else:
                target[:] = data.reshape(ph, pw)
    encode = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-n', '-f', 'rawvideo', '-pix_fmt', 'yuv420p',
        '-s', f'{w}x{h}', '-r', info['avg_frame_rate'], '-i', '-', '-an',
        '-c:v', 'libx264', '-threads', '1', '-preset', args.preset, '-qp', '0',
        '-g', '30', '-keyint_min', '30', '-sc_threshold', '0',
        '-color_primaries', info.get('color_primaries', 'bt709'),
        '-color_trc', info.get('color_transfer', 'bt709'),
        '-colorspace', info.get('color_space', 'bt709'),
        '-video_track_timescale', '15360', '-movflags', '+faststart', str(args.output)
    ], stdin=subprocess.PIPE)
    for frame in frames:
        encode.stdin.write(frame.tobytes())
    encode.stdin.close()
    assert encode.wait() == 0
    del frames, fields
    raw_path.unlink()
    fields_path.unlink()
    work.cleanup()
    report = {'input': str(args.input), 'output': str(args.output),
              'start_frame': args.start, 'end_frame': end,
              'repaired_frames': [n + args.start for n in bad],
              'region': [x, y, rw, rh], 'method': 'bidirectional DIS optical flow; lossless YUV encode'}
    args.output.with_suffix('.repair.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
