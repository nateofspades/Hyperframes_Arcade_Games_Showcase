#!/usr/bin/env python3
"""Full source timeline covered by bounded runtime/layout/contrast audits."""
from pathlib import Path
import json,subprocess,os
root=Path(__file__).resolve().parents[1]
(root/'evidence').mkdir(exist_ok=True)
# The CLI has a fixed 120-second audit deadline. Aim's overlapping timed
# media require expensive pixel occlusion probes, so audit each mini-game
# separately, retaining every original sample and all audit types.
ranges=[('0,32','2,9,18,27'),('32,68','36,45,54,63'),
        ('68,74','70'),('74,79','76'),('79,83','81'),('83,90','86')]
for i,(span,at) in enumerate(ranges,1):
    cmd=['npx','--yes','hyperframes@0.8.186','check','--json','--snapshots','--samples','1','--range',span,'--at',at,'--timeout','90000']
    p=subprocess.run(cmd,cwd=root,env={**os.environ,'HYPERFRAMES_NO_TELEMETRY':'1'},capture_output=True,text=True)
    (root/f'evidence/check-{i}.json').write_text(p.stdout)
    (root/f'evidence/check-{i}.stderr').write_text(p.stderr)
    if p.returncode:raise RuntimeError(f'Range {span} failed; read evidence/check-{i}.json and .stderr')
    d=json.loads(p.stdout)
    assert d['ok'] and not d['browserSkipped'] and d['layout']['samples'] and d['contrast']['checked']>0,d
    print(f"PASS {span}: {d['layout']['samples']}; contrast checks {d['contrast']['checked']}",flush=True)
print('All ranges passed. Range mode skips whole-film craft/frozen sweeps; separately inspect decoded final frames and gameplay motion.')
