// Local QA server with byte ranges, mirroring Pages MP4 seeking behavior.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'site'),port=Number(process.argv[3]||18771);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4'};
http.createServer((req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const stat=fs.statSync(file);if(!stat.isFile())throw Error('Not a file');
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
   if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}else{start=Math.max(0,stat.size-Number(match[2]));}
   if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);
  if(req.method==='HEAD')res.end();else{const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}
 }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
