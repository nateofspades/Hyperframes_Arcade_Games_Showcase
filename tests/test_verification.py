"""Regression tests use explicit synthetic inputs; integration checks use the real MP4."""
import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
class ValidationTests(unittest.TestCase):
    def rules(self):
        p=ROOT/'scripts/validation_rules.py'
        if not p.exists():self.fail('Missing frame-aware baseline validation rules')
        spec=importlib.util.spec_from_file_location('validation_rules',p)
        m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
    def test_duration_rejects_four_seconds_short(self):
        with self.assertRaisesRegex(ValueError,'duration'):
            self.rules().validate_baseline_duration(86.0)
    def test_black_interval_fails_verification(self):
        rules=self.rules()
        self.assertTrue(hasattr(rules,'reject_black_intervals'),'Missing black-interval rejection')
        with self.assertRaisesRegex(ValueError,'Black interval'):
            rules.reject_black_intervals('[blackdetect @ fixture] black_start:5 black_end:6 black_duration:1')
    def test_exact_duration_and_one_frame_tolerance(self):
        self.rules().validate_baseline_duration(90.0)
        self.rules().validate_baseline_duration(90.0+1/30)
        with self.assertRaises(ValueError):self.rules().validate_baseline_duration(90.1)
    def test_motion_verifier_creates_evidence_on_fresh_checkout(self):
        import tempfile,shutil,runpy,sys,contextlib,io
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'scripts').mkdir()
            script=root/'scripts/verify-motion.py'
            shutil.copy2(ROOT/'scripts/verify-motion.py',script)
            # Synthetic frame buffers isolate output-directory behavior from FFmpeg.
            frames=[bytes([value])*57600 for _ in range(10) for value in (0,32)]
            with patch('subprocess.check_output',side_effect=frames),patch.object(sys,'argv',[str(script),'Arcade_Games_Showcase.mp4']),contextlib.redirect_stdout(io.StringIO()):
                runpy.run_path(str(script),run_name='__main__')
            self.assertTrue((root/'evidence/motion-final.json').is_file())
if __name__=='__main__':unittest.main()
