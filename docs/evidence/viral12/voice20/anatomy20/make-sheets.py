from PIL import Image, ImageDraw
from pathlib import Path
import subprocess, io, sys
root=Path(sys.argv[1]).resolve();out=root/'anatomy-final'
def frame(path,t):
 return Image.open(io.BytesIO(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(path),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])))
for name,times,compare in [('comedy',[0,2,4,6,8,10,12,14,17],[0,4,12]),('battle',[0,2,4,6,8,12,16,20,24],[8,12,20]),('champion',[0,2,4,6,8,10,12,16,19],[0,8,16])]:
 p=out/f'{name}-voice20.mp4'
 if not p.exists():continue
 sheet=Image.new('RGB',(1080,1980));d=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  x,y=i%3*360,i//3*660;sheet.paste(frame(p,t),(x,y+20));d.text((x+8,y+4),f'{name} - {t}s',fill='white')
 sheet.save(out/f'{name}-anatomy20-sheet.png')
 before=root/'anatomy-before'/f'{name}-voice20-camera-r3.mp4';sheet=Image.new('RGB',(720,1980));d=ImageDraw.Draw(sheet)
 for i,t in enumerate(compare):
  for j,source in enumerate([before,p]):
   sheet.paste(frame(source,t),(j*360,i*660+20));d.text((j*360+8,i*660+4),f'{"ANTES R3" if j==0 else "DEPOIS Anatomia 2.0"} - {t}s',fill='white')
 sheet.save(out/f'{name}-anatomy20-before-after.png')
p=root/'anatomy-poses';o=Image.new('RGB',(1080,1800),'#163940');d=ImageDraw.Draw(o)
for i,s in enumerate(['snake','dragon','cat','crocodile','fox']):
 for j in range(3):
  im=Image.open(p/f'{s}-{j}.png').crop((0,140,360,500));o.paste(im,(j*360,i*360));d.text((j*360+10,i*360+5),f'{s} / pose {j}',fill='white')
o.save(out/'anatomy20-poses-sheet.png')
