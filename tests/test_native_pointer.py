"""Coordinate/clipping regressions and a tiny real FFmpeg round trip."""
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from PIL import Image

SPEC = importlib.util.spec_from_file_location(
    "native_pointer", Path(__file__).resolve().parents[1] / "scripts/include-native-pointer.py"
)
native = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(native)


class CoordinateTests(unittest.TestCase):
    def setUp(self):
        self.frame = Image.new("RGB", (32, 24), "black")
        self.cursor = Image.new("RGBA", (4, 4), (255, 0, 0, 255))
        self.clip = {"x": 100, "y": 200, "width": 32, "height": 24}

    def composite(self, x, y, cursor=None):
        return native.composite_pointer(self.frame, cursor or self.cursor, self.clip, x, y)

    def test_absolute_coordinates_and_hotspot(self):
        result = self.composite(116, 218)
        self.assertEqual(result.getpixel((5, 7)), (255, 0, 0, 255))
        self.assertEqual(result.getpixel((4, 7)), (0, 0, 0, 255))
        self.assertEqual(result.getpixel((9, 7)), (0, 0, 0, 255))
        self.assertEqual(self.frame.getpixel((5, 7)), (0, 0, 0))

    def test_top_left_clips_source_pixels(self):
        cursor = self.cursor.copy()
        cursor.putpixel((2, 3), (0, 255, 0, 255))
        result = self.composite(109, 208, cursor)
        self.assertEqual(result.getpixel((0, 0)), (0, 255, 0, 255))
        self.assertEqual(result.getpixel((1, 0)), (255, 0, 0, 255))
        self.assertEqual(result.getpixel((2, 0)), (0, 0, 0, 255))
        self.assertEqual(result.getpixel((0, 1)), (0, 0, 0, 255))

    def test_bottom_right_clipping(self):
        result = self.composite(141, 233)
        self.assertEqual(result.size, (32, 24))
        self.assertEqual(result.getpixel((31, 23)), (255, 0, 0, 255))
        self.assertEqual(result.getpixel((29, 22)), (0, 0, 0, 255))

    def test_fully_offscreen_and_touching_edges(self):
        for x, y in ((107, 211), (143, 211), (111, 207), (111, 235), (-100, -100)):
            with self.subTest(x=x, y=y):
                self.assertEqual(self.composite(x, y).tobytes(), self.frame.convert("RGBA").tobytes())

    def test_alpha_composite_not_opaque_paste(self):
        cursor = Image.new("RGBA", (4, 4), (255, 0, 0, 128))
        result = self.composite(111, 211, cursor)
        self.assertEqual(result.getpixel((0, 0)), (128, 0, 0, 255))

    def test_subpixel_rounding(self):
        result = self.composite(116.7, 218.2)
        self.assertEqual(result.getpixel((6, 7)), (255, 0, 0, 255))
        self.assertEqual(result.getpixel((5, 7)), (0, 0, 0, 255))


class MetadataTests(unittest.TestCase):
    def capture(self):
        return {"clip": {"x": 100, "y": 200, "width": 32, "height": 24},
                "fps": 30, "seconds": 0.1,
                "pointer": [{"frame": f, "x": 116, "y": 218} for f in range(3)]}

    def test_complete_unordered_frames(self):
        capture = self.capture()
        capture["pointer"].reverse()
        _, pointers, count = native.validate_capture(capture)
        self.assertEqual(count, 3)
        self.assertEqual(pointers[0]["frame"], 0)

    def test_missing_duplicate_and_extra_frames(self):
        for frames, message in (([0, 2], "missing pointer frame 1"),
                                ([0, 1, 1], "duplicate"), ([0, 1, 3], "out of range")):
            capture = self.capture()
            capture["pointer"] = [{"frame": f, "x": 0, "y": 0} for f in frames]
            with self.subTest(frames=frames), self.assertRaisesRegex(ValueError, message):
                native.validate_capture(capture)

    def test_invalid_metadata(self):
        for field, value in (("fps", 60), ("seconds", 0.11), ("seconds", float("nan"))):
            capture = self.capture()
            capture[field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                native.validate_capture(capture)
        capture = self.capture()
        capture["pointer"][0]["x"] = float("inf")
        with self.assertRaisesRegex(ValueError, "coordinates"):
            native.validate_capture(capture)

    def test_raw_frame_truncation(self):
        self.assertEqual(native.read_frame(io.BytesIO(b"abcdef"), 6), b"abcdef")
        self.assertEqual(native.read_frame(io.BytesIO(), 6), b"")
        with self.assertRaisesRegex(ValueError, "partial"):
            native.read_frame(io.BytesIO(b"abc"), 6)


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "FFmpeg tools required")
class FFmpegTests(unittest.TestCase):
    capture = MetadataTests.capture

    def test_real_encode_and_failure_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, cursor, capture, output = [root / name for name in
                                               ("source.mp4", "cursor.png", "capture.json", "out.mp4")]
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-n", "-f", "lavfi",
                            "-i", "color=black:s=32x24:r=30", "-frames:v", "3",
                            "-c:v", "libx264", str(source)], check=True)
            Image.new("RGBA", (8, 8), "white").save(cursor)
            data = self.capture()
            capture.write_text(json.dumps(data))
            self.assertEqual(native.bake(source, cursor, capture, output), 3)
            probe = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams",
                                    "-of", "json", str(output)], capture_output=True, text=True, check=True)
            streams = json.loads(probe.stdout)["streams"]
            self.assertEqual(len(streams), 1)
            self.assertEqual(streams[0]["codec_name"], "h264")
            self.assertEqual(streams[0]["avg_frame_rate"], "30/1")
            self.assertEqual(streams[0]["nb_read_frames"], "3")
            decoded = subprocess.run(["ffmpeg", "-v", "error", "-i", str(output), "-frames:v", "1",
                                      "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
                                     check=True, capture_output=True).stdout
            frame = Image.frombytes("RGB", (32, 24), decoded)
            self.assertGreater(min(frame.getpixel((7, 9))), 240)
            self.assertLess(max(frame.getpixel((0, 0))), 15)
            before = output.read_bytes()
            with self.assertRaises(FileExistsError):
                native.bake(source, cursor, capture, output)
            self.assertEqual(output.read_bytes(), before)
            for expected in (2, 4):
                data["seconds"] = expected
                data["pointer"] = [{"frame": f, "x": 116, "y": 218} for f in range(expected * 30)]
                capture.write_text(json.dumps(data))
                rejected = root / f"rejected-{expected}.mp4"
                with self.assertRaisesRegex(ValueError, "frame count mismatch"):
                    native.bake(source, cursor, capture, rejected)
                self.assertFalse(rejected.exists())
            # More decoded frames than expected, using a 30-frame source and 3-frame metadata.
            longer = root / "longer.mp4"
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-n", "-f", "lavfi",
                            "-i", "color=black:s=32x24:r=30", "-frames:v", "30",
                            "-c:v", "libx264", str(longer)], check=True)
            capture.write_text(json.dumps(self.capture()))
            with self.assertRaisesRegex(ValueError, "more than 3"):
                native.bake(longer, cursor, capture, root / "excess.mp4")
            self.assertFalse((root / "excess.mp4").exists())
            self.assertFalse(list(root.glob(".native-pointer-*")))


if __name__ == "__main__":
    unittest.main()
