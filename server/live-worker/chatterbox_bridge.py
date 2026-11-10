"""Resident local PT-BR model; parent owns deadlines/cancellation. No fallback."""
import base64,contextlib,gc,io,json,os,resource,sys,time,wave
from pathlib import Path
started=time.perf_counter()
with contextlib.redirect_stdout(sys.stderr):
 import numpy as np
 import torch
 from safetensors.torch import load_file
 from chatterbox.mtl_tts import ChatterboxMultilingualTTS
 from chatterbox.models.t3 import T3
 from chatterbox.models.t3.modules.t3_config import T3Config
 from chatterbox.models.s3gen import S3Gen
 from chatterbox.models.voice_encoder import VoiceEncoder
 from chatterbox.models.tokenizers import MTLTokenizer
 from tokenizers import Tokenizer
 class PortugueseTokenizer(MTLTokenizer):
  # Avoid upstream's unrelated eager Chinese segmenter download.
  def __init__(self,path):
   self.tokenizer=Tokenizer.from_file(path);self.check_vocabset_sot_eot()
  def encode(self,text,language_id=None,**kwargs):
   if language_id!='pt':raise ValueError('Only Portuguese is enabled')
   return super().encode(text,language_id=language_id,**kwargs)
 root=Path(sys.argv[1]).resolve(strict=True);torch.set_num_threads(2)
 device=os.environ.get('HUBLOAN_CHATTERBOX_DEVICE','cpu')
 if device not in ('cpu','cuda'):raise ValueError('Invalid device')
 ve=VoiceEncoder();ve.load_state_dict(torch.load(root/'ve.pt',map_location='cpu',weights_only=True));ve.to(device).eval()
 t3=T3(T3Config.multilingual());weights=load_file(str(root/'t3_pt_br.safetensors'));t3.load_state_dict(weights);del weights;gc.collect();t3.to(device).eval()
 s3gen=S3Gen();weights=torch.load(root/'s3gen_v3.pt',map_location='cpu',weights_only=True)
 mismatch=s3gen.load_state_dict(weights,strict=False)
 # Only deterministic DSP buffers absent in the official V3 checkpoint are allowed.
 if set(mismatch.missing_keys)-{'tokenizer._mel_filters','tokenizer.window'} or mismatch.unexpected_keys:raise ValueError(str(mismatch))
 del weights;gc.collect();s3gen.to(device).eval()
 model=ChatterboxMultilingualTTS(t3,s3gen,ve,PortugueseTokenizer(str(root/'grapheme_mtl_merged_expanded_v1.json')),device)
def memory():
 return dict(peakRssBytes=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024,vramBytes=torch.cuda.max_memory_allocated() if device=='cuda' else None,device=device)
print(json.dumps(dict(ready=True,initializationMs=(time.perf_counter()-started)*1000,**memory())),flush=True)
reference=None
for line in sys.stdin:
 try:
  began=time.perf_counter()
  if len(line)>4096:raise ValueError('Request too large')
  r=json.loads(line);text=r['text'];voice=r['reference'];intensity=float(r.get('exaggeration',.35))
  if not isinstance(text,str) or not 0<len(text)<=200 or '[[' in text:raise ValueError('Invalid text')
  if voice not in ('af_heart','bf_emma') or not .2<=intensity<=.6:raise ValueError('Invalid identity')
  with contextlib.redirect_stdout(sys.stderr):
   if voice!=reference:model.prepare_conditionals(str(root/'references'/f'{voice}.wav'),exaggeration=intensity);reference=voice
   torch.manual_seed(42)
   result=model.generate(text,language_id='pt',exaggeration=intensity,cfg_weight=.5,temperature=.7)
  a=result.squeeze().cpu().numpy();limit=min(20,max(1,int(r.get('maxSeconds',8))))
  if not len(a) or not np.isfinite(a).all() or len(a)>model.sr*limit:raise ValueError('Invalid or overlong speech; never truncated')
  output=io.BytesIO()
  with wave.open(output,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(model.sr);w.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
  print(json.dumps(dict(wav=base64.b64encode(output.getvalue()).decode(),synthesisMs=(time.perf_counter()-began)*1000,**memory())),flush=True)
 except Exception as e:print(json.dumps(dict(error=str(e))),flush=True)
