"""Optional repair-tool regression (run in its NumPy/OpenCV venv)."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

READY = all(importlib.util.find_spec(name) for name in ('numpy', 'cv2'))
ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(READY, 'Repair-only NumPy/OpenCV dependencies are optional')
class FloatRepairTests(unittest.TestCase):
    def test_only_empty_frame_changes_without_retiming(self):
        import numpy as np
        with tempfile.TemporaryDirectory() as folder:
            folder = Path(folder)
            source, output = folder / 'source.mp4', folder / 'fixed.mp4'
            frames = []
            for n in range(5):
                rgb = np.full((128, 96, 3), (34, 31, 64), dtype=np.uint8)
                if n != 2:
                    rgb[20:110, 16 + n * 2:50 + n * 2] = (210, 110, 130)
                frames.append(rgb.tobytes())
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'rawvideo',
                            '-pix_fmt', 'rgb24', '-s', '96x128', '-r', '30',
                            '-i', '-', '-an', '-c:v', 'libx264', '-threads', '1',
                            '-qp', '0', '-pix_fmt', 'yuv420p', str(source)],
                           input=b''.join(frames), check=True)
            subprocess.run([sys.executable, str(ROOT / 'scripts/repair-float-blinks.py'),
                            str(source), str(output), '--region', '0,0,96,128',
                            '--preset', 'ultrafast'], check=True, capture_output=True)
            def decode(path):
                return subprocess.check_output(['ffmpeg', '-v', 'error', '-threads', '1',
                                                '-i', str(path), '-pix_fmt', 'yuv420p',
                                                '-f', 'rawvideo', '-'])
            before, after = decode(source), decode(output)
            size = 96 * 128 * 3 // 2
            self.assertEqual(len(before), len(after))
            self.assertEqual(len(after), size * 5)
            changed = [n for n in range(5) if before[n * size:(n + 1) * size] !=
                       after[n * size:(n + 1) * size]]
            self.assertEqual(changed, [2])
            repaired = np.frombuffer(after[2 * size:3 * size], dtype=np.uint8)
            self.assertGreater(repaired[:96 * 128].std(), 10)
            report = json.loads(output.with_suffix('.repair.json').read_text())
            self.assertEqual(report['repaired_frames'], [2])
            self.assertEqual((report['start_frame'], report['end_frame']), (0, 5))
            # A nonzero trim must not duplicate frames to fill its old PTS gap.
            window = folder / 'window.mp4'
            damaged = folder / 'damaged.json'
            damaged.write_text('[2]')
            subprocess.run([sys.executable, str(ROOT / 'scripts/repair-float-blinks.py'),
                            str(source), str(window), '--region', '0,0,96,128',
                            '--start', '1', '--end', '4', '--bad-frames', str(damaged),
                            '--empty-only', '--preset', 'ultrafast'],
                           check=True, capture_output=True)
            trimmed = decode(window)
            self.assertEqual(len(trimmed), size * 3)
            self.assertEqual(trimmed[:size], before[size:2 * size])
            self.assertEqual(trimmed[2 * size:], before[3 * size:4 * size])


if __name__ == '__main__':
    unittest.main()
