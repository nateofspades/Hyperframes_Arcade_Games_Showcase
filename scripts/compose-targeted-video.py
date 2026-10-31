#!/usr/bin/env python3
"""Selectively revise the published master; preserve all pixels outside explicit masks.

Requires optional numpy/opencv repair environment. Baseline is the backed-up LIVE
MP4, never a historical render. Output is an offline lossless intermediate only;
export-compatible-video.py MUST uniformly encode it before browser delivery.
Static patch images are actual HyperFrames snapshots of the edited compositions.
"""
import argparse,json,subprocess,hashlib
from pathlib import Path
import cv2
import numpy as np
cv2.setNumThreads(1)
W,H=1920,1080
SIZE=W*H*3//2

def decode(path, width=W,height=H,start=0,seconds=None,scale=None,crop=None,pad=None):
    cmd=['ffmpeg','-v','error','-threads','1']
    if start:cmd+=['-ss',str(start)]
    cmd+=['-i',str(path)]
    if seconds:cmd+=['-t',str(seconds)]
    sw,sh=scale or (width,height)
    filters=f'scale={sw}:{sh}:flags=bilinear:out_color_matrix=bt709:out_range=tv'
    if crop:
        cx,cy,cw,ch=crop;filters+=f',crop={cw}:{ch}:{cx}:{cy}:exact=1'
    if pad:
        pw,ph,px,py=pad;filters+=f',pad={pw}:{ph}:{px}:{py}'
    cmd+=['-vf',filters+',format=yuv420p','-threads','1','-fps_mode','passthrough','-f','rawvideo','-']
    return subprocess.Popen(cmd,stdout=subprocess.PIPE)

def planes(data,w,h):
    a=np.frombuffer(data,dtype=np.uint8)
    return [a[:w*h].reshape(h,w),a[w*h:w*h*5//4].reshape(h//2,w//2),a[w*h*5//4:].reshape(h//2,w//2)]

def opacity(local,duration=9):
    a=max(0,min(1,(local-.04)/.4)); a=1-(1-a)**3
    if local>=duration-.45:
        t=max(0,min(1,(local-(duration-.45))/.4))
        a*=1-(4*t**3 if t<.5 else 1-(-2*t+2)**3/2)
    return a

def rgb_planes(im):
    h,w=im.shape[:2]
    # FFmpeg explicitly performs RGB -> limited-range BT.709, matching delivery.
    data=subprocess.check_output(['ffmpeg','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{w}x{h}','-i','-','-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-threads','1','-frames:v','1','-f','rawvideo','-'],input=im.tobytes())
    return [p.astype(np.int16) for p in planes(data,w,h)]

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('baseline',type=Path);ap.add_argument('config',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args()
    assert not a.output.exists(); cfg=json.loads(a.config.read_text())
    assert hashlib.sha256(a.baseline.read_bytes()).hexdigest()==cfg['baseline_sha256']
    for item in cfg['footage']+cfg['static']:
        x,y,w,h=item['region']
        assert all(v%2==0 for v in (x,y,w,h)),('Chroma-aligned rectangle required',item)
        assert 0<=x<x+w<=W and 0<=y<y+h<=H
    streams=[]
    for item in cfg['footage']:
        x,y,w,h=item['region'];item['new_stream']=decode(item['new'],w,h,item.get('new_start',0),9,item.get('scale'),item.get('crop'),item.get('pad'))
        background=cv2.cvtColor(cv2.imread(item['background_image']),cv2.COLOR_BGR2RGB)[y:y+h,x:x+w]
        item['background']=rgb_planes(background)
        bx,by,bw,bh=item.get('bounds',(x,y,w,h))
        xx=np.arange(x,x+w);yy=np.arange(y,y+h)
        item['coverage']=np.clip(np.minimum(xx+1,bx+bw)-np.maximum(xx,bx),0,1)[None,:]*np.clip(np.minimum(yy+1,by+bh)-np.maximum(yy,by),0,1)[:,None]
        streams.append(item)
    for item in cfg['static']:
        x,y,w,h=item['region']
        old=cv2.cvtColor(cv2.imread(item['old_image']),cv2.COLOR_BGR2RGB)[y:y+h,x:x+w]
        new=cv2.cvtColor(cv2.imread(item['new_image']),cv2.COLOR_BGR2RGB)[y:y+h,x:x+w]
        item['delta']=[n-o for n,o in zip(rgb_planes(new),rgb_planes(old))]
    baseline=decode(a.baseline)
    enc=subprocess.Popen(['ffmpeg','-v','error','-n','-f','rawvideo','-pix_fmt','yuv420p','-s',f'{W}x{H}','-r','30','-i','-','-an','-c:v','libx264','-threads','1','-preset','veryfast','-qp','0','-g','60','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-video_track_timescale','15360','-movflags','+faststart',str(a.output)],stdin=subprocess.PIPE)
    counts={};changed_frames=0
    try:
        for n in range(2700):
            data=baseline.stdout.read(SIZE);assert len(data)==SIZE
            raw=np.frombuffer(data,dtype=np.uint8).copy(); ps=planes(raw,W,H); t=n/30
            # Opaque wipes are retained from the approved master, including their
            # antialiased edges. Only active transition windows use this mask.
            mask=np.ones((H,W),np.float32)
            if any(abs(t-b)<.31 for b in [5,14,23,32,41,50,59,68,83]):
                covered=np.zeros((H,W),np.uint8)
                yy=ps[0].astype(np.float32)
                uu=np.repeat(np.repeat(ps[1],2,axis=0),2,axis=1).astype(np.float32)
                vv=np.repeat(np.repeat(ps[2],2,axis=0),2,axis=1).astype(np.float32)
                for rgb in [(26,40,66),(37,69,84),(35,58,99),(65,236,237)]:
                    r,g,b=rgb
                    yv=16+(.2126*r+.7152*g+.0722*b)*219/255
                    uv=128+(-.114572*r-.385428*g+.5*b)*224/255
                    vvv=128+(.5*r-.454153*g-.045847*b)*224/255
                    covered|=((abs(yy-yv)<=6)&(abs(uu-uv)<=6)&(abs(vv-vvv)<=6)).astype(np.uint8)
                covered=cv2.dilate(covered,np.ones((7,7),np.uint8));mask[covered>0]=0
            touched=False
            def apply(region,delta,alpha):
                nonlocal touched
                if alpha<=0:return
                x,y,w,h=region
                for i,p in enumerate(ps):
                    s=1 if i==0 else 2; x0,y0=x//s,y//s; ww,hh=w//s,h//s
                    localmask=mask[y:y+h,x:x+w]
                    if s==2:localmask=localmask.reshape(hh,2,ww,2).min(axis=(1,3))
                    target=p[y0:y0+hh,x0:x0+ww]
                    patch=np.rint(delta[i]*alpha*localmask).astype(np.int16)
                    target[:]=np.clip(target.astype(np.int16)+patch,0,255)
                    touched|=bool(np.any(patch))
            for item in streams:
                if item['start']<=t<item['start']+9:
                    x,y,w,h=item['region']; size=w*h*3//2
                    new=item['new_stream'].stdout.read(size);assert len(new)==size
                    if 'only_frames' in item and n not in item['only_frames']:continue
                    alpha=opacity(t-item['start']);delta=[]
                    for i,(np_,bg) in enumerate(zip(planes(new,w,h),item['background'])):
                        s=1 if i==0 else 2
                        old=ps[i][y//s:(y+h)//s,x//s:(x+w)//s].astype(np.int16)
                        desired=np.rint(np_.astype(np.float32)*alpha+bg*(1-alpha))
                        coverage=item['coverage']
                        if s==2:coverage=coverage.reshape(h//2,2,w//2,2).mean(axis=(1,3))
                        delta.append((desired-old)*coverage)
                    if alpha>0:apply(item['region'],delta,1)
            for item in cfg['static']:
                if item['start']<=t<item['end']:
                    local=t-item['start']
                    alpha=opacity(local,item['end']-item['start']) if item.get('stage') else 1-(1-min(1,max(0,(t-85.2)/.4)))**2
                    apply(item['region'],item['delta'],alpha)
            if touched:changed_frames+=1
            # The independent verification pass rejects any changed YUV sample
            # outside these explicitly authorized rectangles, on every frame.
            enc.stdin.write(raw.tobytes())
            if n%300==0:print('compose',n,'/2700',flush=True)
    finally:
        enc.stdin.close()
    assert baseline.wait()==0 and enc.wait()==0
    for item in streams:
        for key in ['new_stream']:
            item[key].stdout.close();item[key].terminate();item[key].wait()
    report={'frames':2700,'changed_frames':changed_frames,'input_sha256':cfg['baseline_sha256'],'output':str(a.output),'method':'YUV-domain masked native-footage replacement with original seek-safe fade curves and native-rendered scene backgrounds; unchanged master pixels retained outside authorized rectangles; original opaque wipes protected'}
    a.output.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
