import json,pathlib,subprocess,hashlib,io,wave,sys
import numpy as np
from scipy.signal import correlate
root=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path.cwd();out=root/'video20-final';rows=json.loads((root/'assets/measurements.json').read_text());results=[]
for name in ['comedy','battle','champion']:
 p=out/f'{name}-voice20.mp4';report=json.loads((out/f'{name}-voice20.json').read_text())
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
 subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],check=True,capture_output=True)
 framehash=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:v','-f','framemd5','-'],text=True)
 hashes=[line.split(',')[-1].strip() for line in framehash.splitlines() if not line.startswith('#') and line.strip()]
 audio=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a','-ar','48000','-ac','1','-f','f32le','-']),dtype='<f4')
 correlations=[]
 for used in report['voice']['used']:
  row=next(r for r in rows if r['sha256']==used['sha256']);data=(root/'assets'/row['file']).read_bytes()
  assert hashlib.sha256(data).hexdigest()==row['sha256']
  with wave.open(io.BytesIO(data)) as w:rate=w.getframerate();raw=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
  ref=np.interp(np.arange(int(len(raw)*48000/rate))*rate/48000,np.arange(len(raw)),raw)
  # Search only the caption's recorded PCM interval, allowing AAC/mixer priming.
  first=row['text'].split()[:5];caption=next(c for c in report['captions'] if c['text'].split()==first)
  start=max(0,int((caption['start']-.15)*48000));window=audio[start:min(len(audio),int((caption['start']+len(ref)/48000+.15)*48000))]
  if len(window)<len(ref):raise ValueError('Missing voice interval')
  lag=int(np.argmax(correlate(window,ref,mode='valid',method='fft')));observed=window[lag:lag+len(ref)]
  correlations.append(dict(text=row['text'],pcmStartSeconds=caption['start'],measuredStartSeconds=(start+lag)/48000,correlation=float(np.corrcoef(observed,ref)[0,1])))
 assert all(x['correlation']>.8 for x in correlations),correlations
 old=root/'previous'/f'{name}-voice12.mp4'
 assert hashlib.sha256(p.read_bytes()).digest()!=hashlib.sha256(old.read_bytes()).digest()
 results.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,duration=float(probe['format']['duration']),streams=[{k:s.get(k) for k in ['codec_name','width','height','r_frame_rate','sample_rate']} for s in probe['streams']],decodedFrames=len(hashes),distinctFrames=len(set(hashes)),decode='PASS',audioSync=correlations,framing=report['renderer']['framingQuality'],artisticEligibility=report['artisticEligibility'],newRender=True,voice='provisional Chatterbox Heart; archived neural takes; no new inference'))
(out/'validation.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
