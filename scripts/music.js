'use strict';
// Arcade Circuit — original score and synthesis, no samples or dependencies.
// Run: node scripts/music.js (requires ffmpeg/ffprobe on PATH).
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 48000, SECONDS = 90, BPM = 120, N = SR * SECONDS;
const L = new Float32Array(N), R = new Float32Array(N);
const cuts = [5,14,23,32,41,50,59,68,83];
let state = 0x451ab321;
const rand = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296 * 2 - 1; };
const hz = n => 440 * 2 ** ((n-69)/12);
const tri = phase => 1 - 4 * Math.abs((phase % 1) - 0.5);
function add(t, dur, gain, pan, voice) {
  const start = Math.round(t*SR), end = Math.min(N, start+Math.round(dur*SR));
  const gl = gain*Math.sqrt((1-pan)/2), gr = gain*Math.sqrt((1+pan)/2);
  for(let i=start;i<end;i++) { const a=voice((i-start)/SR, i-start); L[i]+=a*gl; R[i]+=a*gr; }
}
function note(t,dur,n,gain,pan=0,kind='lead') {
 const f=hz(n);
 add(t,dur+0.12,gain,pan,(s)=>{
  const attack=kind==='pad'?0.18:0.008;
  const env=Math.min(1,s/attack)*Math.min(1,Math.max(0,(dur+0.12-s)/0.12));
  const p=s*f;
  if(kind==='bass') return env*Math.exp(-s*1.3)*(0.72*Math.sin(2*Math.PI*p)+0.22*tri(p)+0.06*Math.sin(4*Math.PI*p));
  if(kind==='pad') return env*(0.52*tri(p)+0.25*tri(p*1.003)+0.23*Math.sin(2*Math.PI*p*0.997));
  if(kind==='arp') return env*Math.exp(-s*12)*(0.7*tri(p)+0.3*Math.sin(4*Math.PI*p));
  const vibrato=0.0025*Math.sin(2*Math.PI*5*s)*Math.min(1,s/0.2);
  return env*(0.64*tri(p+vibrato)+0.26*Math.sin(2*Math.PI*(p+vibrato))+0.10*Math.sin(4*Math.PI*p));
 });
}
function kick(t,g=0.66) { add(t,0.43,g,0,s=>Math.sin(2*Math.PI*(47*s+9*(1-Math.exp(-s*32))))*Math.exp(-s*10)+0.09*rand()*Math.exp(-s*110)); }
function snare(t,g=0.31) { let last=0; add(t,0.24,g,0.08,s=>{const x=rand();const high=x-last;last=x;return (high*0.62+Math.sin(2*Math.PI*185*s)*0.32)*Math.exp(-s*20)*Math.min(1,s*1200);}); }
function hat(t,g=0.09,open=false) { let last=0;add(t,open?0.23:0.07,g,0.35,s=>{const x=rand(),v=x-last;last=x;return v*Math.exp(-s*(open?22:70))*Math.min(1,s*2200);}); }
function crash(t,g=0.16) { let last=0;add(t,1.5,g,-0.35,s=>{const x=rand(),v=x-last;last=x;return (v*0.7+x*0.3)*Math.exp(-s*4)*Math.min(1,s*900);}); }
// Am / F / C / G; all note values below are newly authored MIDI pitches.
const chords = [[57,60,64,69],[53,57,60,65],[55,60,64,67],[55,59,62,67]];
const bass = [33,29,36,31];
// Four original eight-beat melodies. Positions are in eighth-note units.
const motifs = [
 [[0,76,2],[3,72,1],[4,71,2],[6,69,2],[8,72,2],[11,76,1],[12,79,2],[14,76,2]],
 [[0,77,3],[3,76,1],[4,72,2],[7,69,1],[8,72,2],[10,74,1],[11,76,1],[12,72,3]],
 [[0,76,2],[2,79,2],[5,81,1],[6,79,2],[8,76,3],[11,74,1],[12,72,2],[14,76,2]],
 [[0,74,3],[3,71,1],[4,67,2],[6,71,2],[8,74,2],[10,76,1],[11,74,1],[12,71,2],[14,69,2]]
];
// Intro gradually reveals pad, pulse, arpeggio and rhythm before the 5s cut.
for(let bar=0;bar<45;bar++) {
 const t=bar*2, c=bar%4, final=t>=86;
 const chord=final?[57,60,64,69]:chords[c];
 chord.forEach((n,j)=>note(t,1.85,n, t<4?0.047:0.038,(j-1.5)*0.43,'pad'));
 if(t>=86) continue;
 const energy=t<4?0.43:t<14?0.75:t<32?0.88:t<41?0.72:t<59?0.95:t<68?0.8:1;
 for(let k=0;k<16;k++) {
  const at=t+k*0.125;
  if(at<1) continue;
  const pattern=[0,2,1,3,2,1,0,2];
  const n=chord[pattern[k%8]]+(bar>=16&&bar<20?0:12);
  note(at,0.10,n,0.052*energy,k%2?0.6:-0.6,'arp');
 }
 for(let k=0;k<8;k++) {
  const at=t+k*0.25;
  if(at>=3) note(at,0.19,(final?33:bass[c])+(k===6?12:0),0.24*energy,-0.04,'bass');
  if(at>=4) hat(at, (k%2?0.068:0.047)*energy,k===7&&bar%2===1);
 }
 if(t>=4) {
  kick(t,0.64*energy);kick(t+1,0.60*energy);
  snare(t+0.5,0.29*energy);snare(t+1.5,0.30*energy);
  if(bar%4===3) {kick(t+1.75,0.39*energy);snare(t+1.875,0.12*energy);}
 }
}
// Lead phrases deliberately breathe, develop, and trade registers.
for(let phrase=0;phrase<20;phrase++) {
 const start=6+phrase*4;
 if(start>=83) break;
 const m=motifs[phrase%4];
 const variant=Math.floor(phrase/4);
 for(const [p,base,d] of m) {
  const at=start+p*0.25;
  if(at>=83 || (phrase===7 && p>=8)) continue;
  let n=base;
  if(variant===2 && p>=8) n-=12;
  if(variant>=3 && p===11) n+=2;
  note(at,d*0.25*0.83,n,0.135, -0.10);
  if(variant>=3 && p%4===0) note(at,d*0.25*0.75,n-12,0.035,0.25);
 }
}
// Scene hits are locked to 120-BPM half-second beats, not arbitrary transients.
for(const t of cuts) {crash(t,t===5?0.16:0.12);kick(t,0.22);note(t,0.45,81,0.042,0.5,'arp');}
// Ending: turnaround at 83, settle onto A minor at 86; release through 90.
[[83,74,0.4],[83.5,71,0.4],[84,72,0.4],[84.5,76,0.4],[85,71,0.4],[85.5,68,0.4],[86,69,2.8]].forEach(([t,n,d])=>note(t,d,n,0.14,0));
kick(86,0.42);crash(86,0.12);note(86,2.6,33,0.23,0,'bass');
// Stereo cross-delay (dotted eighth), gentle saturation, mastering fade.
const delay=Math.round(0.375*SR);
for(let i=0;i<N;i++) {
 if(i>=delay) {L[i]+=R[i-delay]*0.15;R[i]+=L[i-delay]*0.13;}
 const t=i/SR;
 const fade=t<0.04?t/0.04:t>86?Math.cos((t-86)/4*Math.PI/2)**1.5:1;
 L[i]=Math.tanh(L[i]*1.18)*0.83*fade;R[i]=Math.tanh(R[i]*1.18)*0.83*fade;
}
for(const dir of ['assets','evidence']) fs.mkdirSync(path.join(root,dir),{recursive:true});
const raw=path.join(root,'assets','arcade-circuit-premaster.wav');
const out=path.join(root,'assets','arcade-circuit.wav');
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+N*4,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(SR,24);header.writeUInt32LE(SR*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(N*4,40);
const fd=fs.openSync(raw,'w');fs.writeSync(fd,header);
const block=Buffer.alloc(48000*4);
for(let start=0;start<N;start+=48000) {const count=Math.min(48000,N-start);for(let j=0;j<count;j++){block.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[start+j]))*32767),j*4);block.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[start+j]))*32767),j*4+2);}fs.writeSync(fd,block,0,count*4);}fs.closeSync(fd);
function ff(args){const p=cp.spawnSync('ffmpeg',['-hide_banner','-nostdin','-nostats','-threads','1','-filter_threads','1',...args],{encoding:'utf8',maxBuffer:8*1024*1024});if(p.status!==0)throw new Error(p.stderr);return p.stderr;}
const first=ff(['-i',raw,'-af','loudnorm=I=-14.5:TP=-1.2:LRA=9:print_format=json','-f','null','-']);
fs.writeFileSync(path.join(root,'evidence','music-premaster-loudnorm.txt'),first);
const stats=JSON.parse(first.slice(first.lastIndexOf('{'),first.lastIndexOf('}')+1));
const filter=`loudnorm=I=-14.5:TP=-1.2:LRA=9:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true:print_format=json`;
const master=ff(['-y','-i',raw,'-af',filter,'-ar','48000','-ac','2','-c:a','pcm_s24le',out]);
fs.writeFileSync(path.join(root,'evidence','music-mastering.txt'),master);
const verify=ff(['-i',out,'-af','loudnorm=I=-14.5:TP=-1:LRA=9:print_format=json','-f','null','-']);
fs.writeFileSync(path.join(root,'evidence','music-final-loudness.txt'),verify);
const probe=cp.spawnSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',out],{encoding:'utf8'});if(probe.status!==0)throw new Error(probe.stderr);
fs.writeFileSync(path.join(root,'evidence','music-ffprobe.json'),probe.stdout);
const finalStats=JSON.parse(verify.slice(verify.lastIndexOf('{'),verify.lastIndexOf('}')+1));
const summary={file:out,duration:JSON.parse(probe.stdout).format.duration,sample_rate:48000,channels:2,bpm:BPM,scene_cuts:cuts,integrated_lufs:Number(finalStats.input_i),true_peak_dbtp:Number(finalStats.input_tp),loudness_range_lu:Number(finalStats.input_lra),seed:'0x451ab321'};
fs.writeFileSync(path.join(root,'evidence','music-summary.json'),JSON.stringify(summary,null,2)+'\n');
if(summary.integrated_lufs < -15 || summary.integrated_lufs > -14 || summary.true_peak_dbtp > -1) throw new Error('Master outside acceptance range: '+JSON.stringify(summary));
fs.unlinkSync(raw);
console.log(JSON.stringify(summary,null,2));
