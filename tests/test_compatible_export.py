import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('compatible_export', ROOT / 'scripts/export-compatible-video.py')
EXPORT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXPORT)


class CompatibleExportTests(unittest.TestCase):
    def test_rejects_profile_change_hidden_behind_initial_high_profile(self):
        headers = '\n'.join([
            '8 profile_idc 01100100 = 100', '24 level_idc 00101001 = 41',
            '8 profile_idc 11110100 = 244', '24 level_idc 00101000 = 40'])
        with patch.object(EXPORT.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, '', headers)):
            with self.assertRaisesRegex(AssertionError, 'profiles'):
                EXPORT.check_headers(Path('mixed-profile.mp4'))

    def test_rejects_missing_sps(self):
        with patch.object(EXPORT.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, '', '')):
            with self.assertRaises(AssertionError):
                EXPORT.check_headers(Path('empty.mp4'))

    def test_real_lossless_intermediate_is_normalized_without_retiming(self):
        with tempfile.TemporaryDirectory() as folder:
            source, output = Path(folder) / 'source.mp4', Path(folder) / 'output.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                            'testsrc2=size=64x64:rate=30:duration=0.2', '-an',
                            '-c:v', 'libx264', '-threads', '1', '-qp', '0',
                            '-pix_fmt', 'yuv420p', str(source)], check=True)
            with self.assertRaisesRegex(AssertionError, 'profiles'):
                EXPORT.check_headers(source)
            subprocess.run(['python3', str(ROOT / 'scripts/export-compatible-video.py'),
                            str(source), str(output)], check=True, capture_output=True)
            before, after = EXPORT.probe(source), EXPORT.probe(output)
            self.assertEqual(after['streams'][0]['nb_frames'], '6')
            self.assertEqual(after['streams'][0]['duration'], before['streams'][0]['duration'])
            self.assertEqual(after['streams'][0]['pix_fmt'], 'yuv420p')
            self.assertEqual(EXPORT.check_headers(output), {'profile_ids': [100], 'level_ids': [41]})


if __name__ == '__main__':
    unittest.main()
