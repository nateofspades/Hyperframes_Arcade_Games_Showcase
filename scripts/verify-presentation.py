#!/usr/bin/env python3
"""Read-only acceptance checks for website/composition copy, shared styles and media fits."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib, json, re, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]
GAMES = ['block','chromatic','rally','orb','float','serpent','brika','aim']
TITLES = ['4 Block Theory','Chromatic Cure','Rally Reactor','Orb Onslaught','Float Tweet Bounce','Serpent Supper','BrikaVolt','Aim Alley Arcade']
ACCENTS = ['#65f3db','#bd9aff','#66f1d5','#66dbff','#ffb77f','#b1f077','#f58bff','#ffb970']
class Cards(HTMLParser):
    def __init__(self):
        super().__init__(); self.cards=[]; self.current=None; self.field=None
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='a' and attrs.get('class')=='game': self.current={};self.cards.append(self.current)
        if self.current is not None and tag in ('h3','p'):self.field=tag;self.current[tag]=''
    def handle_endtag(self,tag):
        if tag==self.field:self.field=None
        if tag=='a':self.current=None
    def handle_data(self,data):
        if self.current is not None and self.field:self.current[self.field]+=data
cards=Cards();cards.feed((ROOT/'site/index.html').read_text());assert len(cards.cards)==8
subprocess.run(['node','scripts/sync-game-segments.mjs','--check'],cwd=ROOT,check=True)
results=[]
for key,title,accent,card in zip(GAMES,TITLES,ACCENTS,cards.cards):
    source=(ROOT/f'compositions/{key}.html').read_text()
    assert card['h3']==title
    assert re.search(rf'id="{key}-title"[^>]*>{re.escape(title)}</h1>',source)
    assert re.search(rf'id="{key}-description"[^>]*>{re.escape(card["p"])}</p>',source)
    assert f'--accent:{accent}' in source
    assert len(re.findall(r'<h1\b',source))==1 and len(re.findall(r'<p\b',source))==1
    assert not re.search(r'eyebrow|mechanic|aim-label|progress|skew|clip-path',source)
    width=float(re.findall(r'--stage-width:([\d.]+)px',source)[-1]);height=float(re.findall(r'--stage-height:([\d.]+)px',source)[-1])
    for attrs in re.findall(r'<video\b([^>]+)>',source):
        values=dict(re.findall(r'([\w-]+)="([^"]*)"',attrs));media=ROOT/values['src']
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(media)]))
        stream=next(s for s in probe['streams'] if s['codec_type']=='video')
        assert abs(width/height-stream['width']/stream['height'])<.002,(key,'stage aspect mismatch')
        assert float(values.get('data-media-start',0))+float(values['data-duration'])<=float(probe['format']['duration'])+.034,(key,'media overrun')
    results.append({'game':title,'description':card['p'],'accent':accent,'frame':[width,height]})
assert cards.cards[1]['p']=='Drop and match colorful pieces, trigger chain reactions, and clear the board.'
outro=(ROOT/'compositions/outro.html').read_text()
assert outro.count('class="endtile"')==8
assert '8</span> ARCADE GAMES.' in outro and 'ONE COLLECTION.' in outro
assert 'PLAY FREE IN YOUR BROWSER.' in outro
assert 'nateofspades.github.io/Hyperframes_Arcade_Games_Showcase</p>' in outro
if len(sys.argv)>1:assert hashlib.sha256((ROOT/'README.md').read_bytes()).hexdigest()==sys.argv[1],'README changed'
print(json.dumps({'passed':True,'games':results,'external_text':'Only title and matching card description in every gameplay scene'},indent=2))
