#!/usr/bin/env python3
"""Compare decoded gameplay-only regions after entrances settle; reject frozen panels."""
import pathlib,subprocess,json,sys
root=pathlib.Path(__file__).resolve().parents[1]; video=root/(sys.argv[1] if len(sys.argv)>1 else 'Arcade_Games_Showcase.mp4')
shots=[('4 Block Theory',6,12,(1000,80,460,920)),('Chromatic Cure',15,21,(1000,80,460,920)),('Rally Reactor',24,30,(190,252,1540,704)),('Orb Onslaught',33,39,(190,252,1540,704)),('Float Tweet Bounce',42,48,(990,80,518,920)),('Serpent Supper',51,57,(864,130,888,888)),('BrikaVolt',60,66,(942,80,736,920)),('Aim Alley: Target Practice',69,72,(190,252,1540,704)),('Aim Alley: Moving Targets',75,77,(190,252,1540,704)),('Aim Alley: Precision Shooting',80,82,(190,252,1540,704))]
regions=root/'docs/revision-gameplay-regions.json'
if regions.exists():
 revised=json.loads(regions.read_text())
 shots=[(name,t1,t2,revised.get(name,rect)) for name,t1,t2,rect in shots]
def frame(t,rect):
 x,y,w,h=rect
 return subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-threads','1','-ss',str(t),'-i',str(video),'-vf',f'crop={w}:{h}:{x}:{y},scale=320:180,format=gray','-frames:v','1','-f','rawvideo','pipe:1'])
results=[]
for name,t1,t2,rect in shots:
 a,b=frame(t1,rect),frame(t2,rect);assert len(a)==len(b)==320*180
 mae=sum(abs(x-y) for x,y in zip(a,b))/len(a);changed=sum(abs(x-y)>8 for x,y in zip(a,b))
 result={'game':name,'times':[t1,t2],'crop':rect,'mean_absolute_luma_change':mae,'pixels_changing_by_more_than_8':changed,'passed':mae>.05 and changed>10};results.append(result);print(result,flush=True)
(root/'evidence').mkdir(parents=True,exist_ok=True)
(root/'evidence'/('motion-final.json' if video.name=='Arcade_Games_Showcase.mp4' else 'motion-draft.json')).write_text(json.dumps(results,indent=2))
assert all(x['passed'] for x in results),'At least one gameplay panel may be frozen; inspect decoded frames.'
