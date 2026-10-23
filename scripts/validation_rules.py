"""Small independently testable rules for the 90-second delivery baseline."""
def validate_baseline_duration(seconds, fps=30):
    if abs(float(seconds)-90.0)>1.0/fps+1e-6:
        raise ValueError(f'Baseline duration must be 90 seconds within one frame; got {seconds}')

def reject_black_intervals(log):
    import re
    intervals=[float(x) for x in re.findall(r'black_duration:([0-9.]+)',log)]
    if any(x>=0.2 for x in intervals):
        raise ValueError(f'Black interval detected: {intervals}; inspect the saved blackdetect log')
