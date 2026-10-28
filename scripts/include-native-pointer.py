#!/usr/bin/env python3
"""Bake a captured OS cursor into footage (requires Pillow, ffmpeg and ffprobe).

Usage: include-native-pointer.py POINTERLESS.mp4 CURSOR.png CAPTURE.json OUTPUT.mp4
Pointer records use zero-based frame indices and absolute page coordinates.
Subpixel positions are rounded to the nearest pixel (Python's round).
"""
import argparse
from decimal import Decimal
from fractions import Fraction
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile

from PIL import Image

FPS = 30
HOTSPOT = (11, 11)


def composite_pointer(frame, cursor, clip, x, y):
    """Return an RGBA frame with the cursor clipped to the capture rectangle."""
    result = frame.convert("RGBA")
    left = round(x - clip["x"]) - HOTSPOT[0]
    top = round(y - clip["y"]) - HOTSPOT[1]
    x0, y0 = max(0, left), max(0, top)
    x1 = min(result.width, left + cursor.width)
    y1 = min(result.height, top + cursor.height)
    if x0 < x1 and y0 < y1:
        visible = cursor.convert("RGBA").crop(
            (x0 - left, y0 - top, x1 - left, y1 - top)
        )
        result.alpha_composite(visible, (x0, y0))
    return result


def finite_number(value):
    return (isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value))


def validate_capture(data):
    """Validate metadata and return (clip, ordered pointers, frame count)."""
    clip = data["clip"]
    for key in ("x", "y", "width", "height"):
        if not finite_number(clip[key]):
            raise ValueError(f"clip.{key} must be finite")
    for key in ("width", "height"):
        if clip[key] <= 0 or int(clip[key]) != clip[key]:
            raise ValueError(f"clip.{key} must be a positive integer")
    if data["fps"] != FPS or isinstance(data["fps"], bool):
        raise ValueError("capture fps must be 30")
    seconds = data["seconds"]
    if not finite_number(seconds) or seconds <= 0:
        raise ValueError("seconds must be positive and finite")
    total = Decimal(str(seconds)) * FPS
    if total != total.to_integral_value():
        raise ValueError("seconds * 30 must be an integer frame count")
    count = int(total)
    pointers = {}
    for entry in data["pointer"]:
        frame = entry["frame"]
        if type(frame) is not int or not 0 <= frame < count:
            raise ValueError(f"pointer frame out of range: {frame!r}")
        if frame in pointers:
            raise ValueError(f"duplicate pointer frame: {frame}")
        if not all(finite_number(entry[key]) for key in ("x", "y")):
            raise ValueError(f"invalid coordinates at pointer frame {frame}")
        pointers[frame] = entry
    if len(pointers) != count:
        missing = next(frame for frame in range(count) if frame not in pointers)
        raise ValueError(f"missing pointer frame {missing}; expected {count}, got {len(pointers)}")
    return clip, pointers, count


def read_frame(stream, size):
    """Read exactly one raw frame, tolerating short pipe reads."""
    chunks = bytearray()
    while len(chunks) < size:
        chunk = stream.read(size - len(chunks))
        if not chunk:
            break
        chunks.extend(chunk)
    if chunks and len(chunks) != size:
        raise ValueError(f"partial decoded frame: {len(chunks)} of {size} bytes")
    return bytes(chunks)


def bake(source, cursor_path, capture_path, output):
    source, output = Path(source).resolve(), Path(output).absolute()
    if os.path.lexists(output):
        raise FileExistsError(f"refusing to overwrite {output}")
    with open(capture_path, encoding="utf-8") as handle:
        clip, pointers, expected = validate_capture(json.load(handle))
    with Image.open(cursor_path) as image:
        if image.format != "PNG":
            raise ValueError("native cursor must be a PNG")
        cursor = image.convert("RGBA")
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,avg_frame_rate", "-of", "json", str(source)],
        check=True, capture_output=True, text=True,
    )
    streams = json.loads(probe.stdout)["streams"]
    if not streams:
        raise ValueError("input has no video stream")
    video = streams[0]
    width, height = video["width"], video["height"]
    padded = tuple(int(clip[key]) + int(clip[key]) % 2 for key in ("width", "height"))
    if (width, height) != padded:
        raise ValueError("input dimensions do not match capture clip")
    if Fraction(video["avg_frame_rate"]) != FPS:
        raise ValueError("input frame rate must be 30")

    # File-backed stderr cannot fill a pipe and stall either FFmpeg process.
    # Publish only a complete, count-checked MP4; hard-link publication is atomic
    # and refuses even an output created by another process during encoding.
    with tempfile.TemporaryDirectory(prefix=".native-pointer-", dir=output.parent) as tmp, \
            tempfile.TemporaryFile() as decoder_log, tempfile.TemporaryFile() as encoder_log:
        staged = Path(tmp) / "output.mp4"
        decoder = encoder = None
        try:
            decoder = subprocess.Popen(
                ["ffmpeg", "-nostdin", "-v", "error", "-xerror", "-i", str(source),
                 "-map", "0:v:0", "-an", "-threads", "1", "-fps_mode", "passthrough", "-f", "rawvideo",
                 "-pix_fmt", "rgb24", "pipe:1"],
                stdout=subprocess.PIPE, stderr=decoder_log,
            )
            encoder = subprocess.Popen(
                ["ffmpeg", "-nostdin", "-v", "error", "-n", "-f", "rawvideo",
                 "-pix_fmt", "rgb24", "-s", f"{width}x{height}", "-framerate", str(FPS),
                 "-i", "pipe:0", "-an", "-c:v", "libx264", "-threads", "1", "-crf", "17", "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
                 "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(staged)],
                stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=encoder_log,
            )
            count = 0
            while True:
                raw = read_frame(decoder.stdout, width * height * 3)
                if not raw:
                    break
                if count >= expected:
                    raise ValueError(f"decoded more than {expected} expected frames")
                frame = Image.frombytes("RGB", (width, height), raw)
                pointer = pointers[count]
                rendered = composite_pointer(frame, cursor, clip, pointer["x"], pointer["y"])
                encoder.stdin.write(rendered.convert("RGB").tobytes())
                count += 1
            decoder.stdout.close()
            if decoder.wait() != 0:
                raise RuntimeError("FFmpeg decoder failed")
            if count != expected:
                raise ValueError(f"decoded frame count mismatch: expected {expected}, got {count}")
            encoder.stdin.close()
            if encoder.wait() != 0:
                raise RuntimeError("FFmpeg encoder failed")
            os.link(staged, output)
            return count
        except BaseException as exc:
            # Kill BOTH peers before waiting or closing buffered stdin: otherwise
            # an early encoder failure or a partial decode can leave a pipe stuck.
            for process in (decoder, encoder):
                if process is not None and process.poll() is None:
                    process.kill()
            for process in (decoder, encoder):
                if process is not None:
                    process.wait()
                    for stream in (process.stdin, process.stdout):
                        if stream is not None:
                            try:
                                stream.close()
                            except OSError:
                                pass
            for label, log in (("decoder", decoder_log), ("encoder", encoder_log)):
                log.seek(0)
                message = log.read().decode("utf-8", errors="replace").strip()
                if message:
                    exc.add_note(f"FFmpeg {label}: {message}")
            raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pointerless_mp4")
    parser.add_argument("native_cursor_png")
    parser.add_argument("capture_json")
    parser.add_argument("output_mp4")
    args = parser.parse_args()
    try:
        count = bake(args.pointerless_mp4, args.native_cursor_png, args.capture_json, args.output_mp4)
    except (OSError, ValueError, KeyError, TypeError, RuntimeError, subprocess.SubprocessError) as exc:
        parser.exit(1, f"error: {exc}\n" + "".join(f"{note}\n" for note in getattr(exc, "__notes__", [])))
    print(f"Wrote {args.output_mp4}: {count} frames at 30 fps (no audio)")


if __name__ == "__main__":
    main()
