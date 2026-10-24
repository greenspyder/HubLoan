"""Fixed original score, offline synthesis, no external samples or AI singing.
24 bars, 132 BPM. Candidate for listening, not artistically approved.
"""
from pathlib import Path
import wave,json,hashlib
import numpy as np
R=48000; B=60/132; BAR=4*B; N=round(24*BAR*R)
y=np.zeros(N); rng=np.random.default_rng(42021)
def add(at,a,gain):
 i=round(at*R); n=min(len(a),N-i)
 if n>0:y[i:i+n]+=a[:n]*gain
def tone(note,duration,bass=False):
 t=np.arange(round(duration*R))/R;f=440*2**((note-69)/12)
 a=np.sin(2*np.pi*f*t) if bass else np.sin(2*np.pi*f*t+1.6*np.sin(4*np.pi*f*t)*np.exp(-t*8))
 return a*np.minimum(1,t/.005)*np.exp(-t/(.28 if bass else .22))*np.minimum(1,(duration-t)/.03)
def noise(duration,decay):
 t=np.arange(round(duration*R))/R;n=rng.uniform(-1,1,len(t));return np.r_[0,np.diff(n)]*.5*np.exp(-t*decay)
t=np.arange(round(.26*R))/R
kick=np.sin(2*np.pi*(48*t+52*(1-np.exp(-t*35))/35))*np.exp(-t*17)*np.minimum(1,t/.002)
hat=noise(.055,80);clap=noise(.16,35);rim=noise(.07,65)
roots=[29,25,27,24]
motifs=[[(0,77),(3,80),(7,84),(11,79)],[(2,80),(6,77),(10,75)],[(0,79),(5,82),(9,84),(14,79)],[(1,79),(6,75),(12,72)]]
for bar in range(24):
 at=bar*BAR; root=roots[(bar//2)%4];energy=.72 if bar<4 or bar>=20 else 1
 for st in ([0,3,7,10,14] if bar%2==0 else [0,6,9,14]):
  add(at+st*B/4,kick,.31*energy)
  if bar>=2:add(at+st*B/4+.028,tone(root,.32,True),.24*energy)
 for st in [4,12]:add(at+st*B/4,clap,.18*energy)
 for j,st in enumerate(range(0,16,2)):add(at+st*B/4,hat,(.035 if j%2==0 else .06)*energy)
 for st in [3,10,15]:add(at+st*B/4,rim,.06*energy)
 if bar%2==0 or 8<=bar<16:
  for st,n in motifs[(bar//2)%4]:
   a=tone(n,.65);add(at+st*B/4,a,.075);add(at+st*B/4+B*.75,a,.023);add(at+st*B/4+B*1.5,a,.009)
 t=np.arange(round(BAR*R))/R;env=np.minimum(1,t/.3)*np.minimum(1,(BAR-t)/.45)
 pad=sum(np.sin(2*np.pi*440*2**((root+24+n-69)/12)*t) for n in [0,3,7])/3
 add(at,pad*env,.035)
y-=y.mean();y=np.tanh(y*.9);y*=min(1,.75/max(abs(y)))
f=720;y[:f]*=np.linspace(0,1,f);y[-f:]*=np.linspace(1,0,f)
out=Path(__file__).resolve().parents[2]/'docs/evidence/phase42-rtmp-fix/music';out.mkdir(parents=True,exist_ok=True);p=out/'lume-jardim-digital-132.wav'
with wave.open(str(p),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(R);w.writeframes((y*32767).astype('<i2').tobytes())
meta={'title':'Lume — Jardim Digital','category':'ambient','kind':'ORIGINAL_INSTRUMENTAL','creator':'HubLoan / composição assistida por Codex','source':'Partitura fixa scripts/music/lume-jardim-digital.py; síntese offline sem samples externos','license':'CC0-1.0; composição e timbres originais desta entrega, sem samples externos','commercialLiveRights':True,'costMinor':0,'bpm':132,'seconds':N/R,'hash':hashlib.sha256(p.read_bytes()).hexdigest(),'peakDbFS':float(20*np.log10(max(abs(y)))),'rmsDbFS':float(20*np.log10(np.sqrt(np.mean(y*y)))),'approval':'PENDING_LISTENING','aiGeneratedMusic':False}
(out/'track.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print(meta)
