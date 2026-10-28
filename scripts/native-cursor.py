"""Read the actual X11 cursor selected by headed Chromium; no drawn substitute."""
import ctypes as C
import sys
from PIL import Image
x=C.CDLL('libX11.so.6');f=C.CDLL('libXfixes.so.3')
x.XOpenDisplay.argtypes=[C.c_char_p];x.XOpenDisplay.restype=C.c_void_p
D=x.XOpenDisplay(b':98')
if not D:raise RuntimeError('Xvfb :98 unavailable')
x.XDefaultRootWindow.argtypes=[C.c_void_p];x.XDefaultRootWindow.restype=C.c_ulong
x.XWarpPointer.argtypes=[C.c_void_p,C.c_ulong,C.c_ulong,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_int,C.c_int]
x.XFlush.argtypes=[C.c_void_p]
x.XWarpPointer(D,0,x.XDefaultRootWindow(D),0,0,0,0,int(sys.argv[1]),int(sys.argv[2]));x.XFlush(D)
class Cursor(C.Structure):
 _fields_=[('x',C.c_short),('y',C.c_short),('width',C.c_ushort),('height',C.c_ushort),('xhot',C.c_ushort),('yhot',C.c_ushort),('serial',C.c_ulong),('pixels',C.POINTER(C.c_ulong)),('atom',C.c_ulong),('name',C.c_char_p)]
f.XFixesGetCursorImage.argtypes=[C.c_void_p];f.XFixesGetCursorImage.restype=C.POINTER(Cursor)
# XSync ensures the pointer change has been processed by the server.
x.XSync.argtypes=[C.c_void_p,C.c_int];x.XSync(D,0)
c=f.XFixesGetCursorImage(D).contents
im=Image.new('RGBA',(c.width,c.height));im.putdata([((p>>16)&255,(p>>8)&255,p&255,(p>>24)&255) for p in c.pixels[:c.width*c.height]])
im.save(sys.argv[3]);print(c.width,c.height,c.xhot,c.yhot,c.name)
