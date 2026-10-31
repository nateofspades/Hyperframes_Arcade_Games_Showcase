import unittest,subprocess,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='771c2a6142fabd6117bd8fdc071badfed404d291'
GAMES=['block','chromatic','rally','orb','float','serpent','brika','aim']
def before(path):return subprocess.check_output(['git','show',f'{BASE}:{path}'],cwd=ROOT,text=True)
class TargetedScopeTests(unittest.TestCase):
 def test_complete_game_compositions_only_allow_explicit_local_edits(self):
  approved={'rally':'d84ad7b457c1844322db71c7a9ae8bff34e08c9633884217fc2f9496191bf199','brika':'0d246a1e50dadba545f9b1e9f3739ab8d207c65c7885f1ec80b1b236c17fb6e3','serpent':'15663a21553092749305f99f568627d072e32deade1e7afa9d566cb9f74f1270','aim':'017bfe034838243452af44052189080b4bc5a0cee05f2e5a053d878414d8b1f3'}
  for game in GAMES:
   path=f'compositions/{game}.html';old=before(path);new=(ROOT/path).read_text()
   if game in approved:
    addition=re.search(r'<!-- game-segment:styles:end -->\n(<style>.*?</style>)\n',new,re.S).group(1)
    self.assertEqual(hashlib.sha256(addition.encode()).hexdigest(),approved[game])
    new=new.replace(addition+'\n','',1)
   if game in ['chromatic','rally','orb','float','brika']:
    tag=re.search(rf'<video[^>]+id="{game}-video"[^>]*>',new).group()
    original=re.search(rf'<video[^>]+id="{game}-video"[^>]*>',old).group()
    folder='final-three-2026-10-31' if game=='chromatic' else 'targeted-2026-10-30'
    self.assertIn(f'src="assets/footage/{folder}/{game}.mp4"',tag)
    strip=lambda text:re.sub(r' (?:src|data-media-start)="[^"]*"','',text)
    self.assertEqual(strip(tag),strip(original))
    new=new.replace(tag,original,1)
   self.assertEqual(new,old,game)
 def test_master_opening_transitions_music_and_closing_grid_unchanged(self):
  for path in ['index.html','compositions/intro.html',*[f'compositions/cut{i}.html' for i in range(8)]]:
   self.assertEqual((ROOT/path).read_text(),before(path),path)
  old=before('compositions/outro.html');new=(ROOT/'compositions/outro.html').read_text()
  self.assertEqual(new,old.replace('nateofspades.github.io/Hyperframes_Arcade_Games_Showcase','https://github.com/nateofspades/Hyperframes_Arcade_Games_Showcase'))
 def test_external_copy_typography_and_motion_unchanged(self):
  for game in GAMES:
   path=f'compositions/{game}.html';old=before(path);new=(ROOT/path).read_text()
   for kind in ['styles','motion']:
    pattern=rf'<!-- game-segment:{kind}:start -->.*?<!-- game-segment:{kind}:end -->'
    self.assertEqual(re.search(pattern,new,re.S).group(),re.search(pattern,old,re.S).group(),(game,kind))
   for cls in ['game-title','game-description']:
    pattern=rf'<[^>]+class="{cls}"[^>]*>.*?</[^>]+>'
    self.assertEqual(re.search(pattern,new,re.S).group(),re.search(pattern,old,re.S).group(),(game,cls))
 def test_webpage_only_video_cache_identifier_may_change(self):
  for p in (ROOT/'site').rglob('*'):
   if not p.is_file():continue
   path=p.relative_to(ROOT).as_posix()
   if path=='site/index.html':
    normalize=lambda text:re.sub(r'showcase\.mp4\?v=[a-zA-Z0-9_-]+','showcase.mp4?v=TOKEN',text)
    self.assertEqual(normalize(p.read_text()),normalize(before(path)))
   else:self.assertEqual(p.read_bytes(),subprocess.check_output(['git','show',f'{BASE}:{path}'],cwd=ROOT),path)
if __name__=='__main__':unittest.main()
