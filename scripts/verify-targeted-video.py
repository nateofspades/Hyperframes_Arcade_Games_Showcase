#!/usr/bin/env python3
"""Independent all-frame preservation, timestamp, codec and soundtrack gate."""
import argparse,json,subprocess,hashlib,struct
from pathlib import Path
import numpy as np
import importlib.util
W,H=1920,1080
SIZE=W*H*3//2

def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
def decoder(path):return subprocess.Popen(['ffmpeg','-v','error','-threads','1','-i',str(path),'-map','0:v','-pix_fmt','yuv420p','-threads','1','-fps_mode','passthrough','-f','rawvideo','-'],stdout=subprocess.PIPE)
def audio(path):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts,dts,duration,data_hash','-of','json',str(path)]))
def container(path):
 atoms=[]
 with path.open('rb') as f:
  while f.tell()<path.stat().st_size:
   start=f.tell();header=f.read(8);assert len(header)==8
   size,kind=struct.unpack('>I4s',header)
   if size==1:size=struct.unpack('>Q',f.read(8))[0]
   if size==0:size=path.stat().st_size-start
   assert size>=8 and start+size<=path.stat().st_size
   atoms.append(kind.decode());f.seek(start+size)
  assert f.tell()==path.stat().st_size
 assert atoms.index('moov')<atoms.index('mdat')
 return atoms

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('baseline',type=Path);ap.add_argument('offline',type=Path);ap.add_argument('delivery',type=Path);ap.add_argument('config',type=Path);ap.add_argument('report',type=Path);a=ap.parse_args()
 cfg=json.loads(a.config.read_text());p=probe(a.delivery);v=next(s for s in p['streams'] if s['codec_type']=='video');au=next(s for s in p['streams'] if s['codec_type']=='audio')
 helpers_spec=importlib.util.spec_from_file_location('targeted_helpers',Path(__file__).with_name('compose-targeted-video.py'));helpers=importlib.util.module_from_spec(helpers_spec);helpers_spec.loader.exec_module(helpers)
 expected={};corrections={}
 for item in cfg['footage']:
  x,y,w,h=item['region'];assert all(z%2==0 for z in (x,y,w,h))
  expected[item['id']]=helpers.decode(item['new'],w,h,item.get('new_start',0),9,item.get('scale'),item.get('crop'),item.get('pad'))
  corrections[item['id']]={'changed_frames':0,'source_frames_verified':0}
 for item in cfg['static']:corrections[item['id']]={'changed_frames':0}
 assert (v['width'],v['height'],v['avg_frame_rate'],v['nb_frames'],v['duration'],v['profile'],v['pix_fmt'],v['time_base'])==(1920,1080,'30/1','2700','90.000000','High','yuv420p','1/15360')
 assert au['codec_name']=='aac' and au['profile']=='LC' and au['duration']=='90.000000'
 assert audio(a.baseline)==audio(a.delivery),'AAC payload/timestamps changed'
 stamps=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v','-show_frames','-show_entries','frame=pts','-of','json',str(a.delivery)]))['frames']
 assert [s['pts'] for s in stamps]==list(range(0,2700*512,512)),'Frame timestamps not uniform'
 subprocess.run(['ffmpeg','-v','error','-xerror','-err_detect','explode','-threads','1','-i',str(a.delivery),'-f','null','-'],check=True)
 ds=[decoder(p) for p in [a.baseline,a.offline,a.delivery]];changed=0;outside=0;min_psnr=999;max_delta=0
 for n in range(2700):
  arrays=[]
  for d in ds:
   data=d.stdout.read(SIZE);assert len(data)==SIZE;arrays.append(np.frombuffer(data,np.uint8))
  base,offline,final=arrays
  allowed=np.zeros((H,W),bool);t=n/30
  for item in cfg['footage']+cfg['static']:
   end=item.get('end',item['start']+9)
   if item['start']<=t<end and ('only_frames' not in item or n in item['only_frames']):
    x,y,w,h=item['region'];allowed[y:y+h,x:x+w]=True
  flat=np.concatenate([allowed.ravel(),allowed.reshape(H//2,2,W//2,2).any(axis=(1,3)).ravel(),allowed.reshape(H//2,2,W//2,2).any(axis=(1,3)).ravel()])
  delta=base!=offline
  assert not np.any(delta&~flat),f'Unauthorized offline pixel change at frame {n}'
  if any(abs(t-boundary)<.31 for boundary in [5,14,23,32,41,50,59,68,83]):
   yy,uu,vv=helpers.planes(base,W,H);u=np.repeat(np.repeat(uu,2,axis=0),2,axis=1).astype(float);vr=np.repeat(np.repeat(vv,2,axis=0),2,axis=1).astype(float)
   protected=np.zeros((H,W),bool)
   for r,g,b in [(26,40,66),(37,69,84),(35,58,99),(65,236,237)]:
    yc=16+(.2126*r+.7152*g+.0722*b)*219/255;uc=128+(-.114572*r-.385428*g+.5*b)*224/255;vc=128+(.5*r-.454153*g-.045847*b)*224/255
    protected|=(abs(yy.astype(float)-yc)<=6)&(abs(u-uc)<=6)&(abs(vr-vc)<=6)
   assert not np.any(delta[:W*H].reshape(H,W)&protected),('Original wipe pixels changed',n)
  for item in cfg['footage']+cfg['static']:
   if not item['start']<=t<item.get('end',item['start']+9):continue
   x,y,w,h=item['region'];op=helpers.planes(offline,W,H);bp=helpers.planes(base,W,H)
   if 'only_frames' not in item or n in item['only_frames']:
    corrections[item['id']]['changed_frames']+=bool(np.any(op[0][y:y+h,x:x+w]!=bp[0][y:y+h,x:x+w]))
   if item['id'] in expected:
    size=w*h*3//2;data=expected[item['id']].stdout.read(size);assert len(data)==size
    if .5<=t-item['start']<=8.5 and ('only_frames' not in item or n in item['only_frames']):
     for i,ep in enumerate(helpers.planes(data,w,h)):
      s=1 if i==0 else 2
      bx,by,bw,bh=item.get('bounds',(x,y,w,h));xx=np.arange(x,x+w);yy=np.arange(y,y+h)
      full=((xx>=bx)&(xx+1<=bx+bw))[None,:]&((yy>=by)&(yy+1<=by+bh))[:,None]
      if s==2:full=full.reshape(h//2,2,w//2,2).all(axis=(1,3))
      assert np.array_equal(op[i][y//s:(y+h)//s,x//s:(x+w)//s][full],ep[full]),('Source/output mismatch',item['id'],n,i)
     corrections[item['id']]['source_frames_verified']+=1
  changed+=bool(np.any(delta))
  quant=final.astype(np.float32)-offline.astype(np.float32);mse=float(np.mean(quant*quant));psnr=999 if mse==0 else float(10*np.log10(255**2/mse));min_psnr=min(min_psnr,psnr);max_delta=max(max_delta,int(np.max(np.abs(quant))))
  if n%300==0:print('verify',n,'/2700',flush=True)
 for d in ds:assert not d.stdout.read(1) and d.wait()==0
 for item in cfg['footage']:
  d=expected[item['id']];d.stdout.close();d.terminate();d.wait()
  assert corrections[item['id']]['source_frames_verified']>0,item['id']
 for name,values in corrections.items():assert values['changed_frames']>0,('Missing correction',name)
 assert min_psnr>=55,('Unexpected delivery quantization',min_psnr)
 report={'frames_compared':2700,'offline_changed_frames':changed,'unauthorized_offline_pixels':outside,'original_opaque_wipe_pixels_identical':True,'per_correction':corrections,'delivery_min_frame_psnr_db':min_psnr,'delivery_max_component_error':max_delta,'aac_packets_and_timestamps_identical':True,'frame_pts_uniform':True,'complete_decode_errors':0,'container_atoms':container(a.delivery),'sha256':hashlib.sha256(a.delivery.read_bytes()).hexdigest(),'probe':p}
 a.report.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='probe'},indent=2))
if __name__=='__main__':main()
