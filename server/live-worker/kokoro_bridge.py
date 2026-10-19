"""Optional offline Kokoro 82M. Official local weights only. TTS, never singing."""
import base64, contextlib, io, json, sys, wave
from pathlib import Path
with contextlib.redirect_stdout(sys.stderr):
    import numpy as np
    import torch
    from kokoro import KModel, KPipeline
    torch.set_num_threads(2)
    root = Path(sys.argv[1]).resolve(strict=True)
    for name, limit in [('kokoro-v1_0.pth',350000000),('config.json',100000),('pf_dora.pt',1000000),('pm_alex.pt',1000000),('pm_santa.pt',1000000)]:
        if (root/name).stat().st_size > limit: raise ValueError('Asset too large')
    model = KModel(config=str(root/'config.json'), model=str(root/'kokoro-v1_0.pth')).eval()
    pipeline = KPipeline(lang_code='p', model=model)
    voices = {k:torch.load(root/v, map_location='cpu', weights_only=True) for k,v in {'host':'pf_dora.pt','bright':'pm_alex.pt','deep':'pm_santa.pt'}.items()}
print(json.dumps({'ready':True}),flush=True)
for line in sys.stdin:
    try:
        if len(line)>4096: raise ValueError()
        r=json.loads(line);text=r['text']
        if not isinstance(text,str) or not 0<len(text)<=200 or '[[' in text: raise ValueError()
        parts=[];remaining=24000*8
        with contextlib.redirect_stdout(sys.stderr), torch.no_grad():
            for result in pipeline(text, voice=voices[r['voice']], speed=1):
                data=result.audio.detach().cpu().numpy()[:remaining];parts.append(data);remaining-=len(data)
                if remaining<=0: break
        audio=(np.clip(np.concatenate(parts),-1,1)*32767).astype('<i2');output=io.BytesIO()
        with wave.open(output,'wb') as wav:
            wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(24000);wav.writeframes(audio.tobytes())
        print(json.dumps({'wav':base64.b64encode(output.getvalue()).decode('ascii')}),flush=True)
    except Exception:
        print(json.dumps({'error':'Synthesis failed'}),flush=True)
