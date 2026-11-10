"""Explicit local model setup. Downloads pinned/hash-checked official assets only."""
import hashlib,json,pathlib,sys,urllib.request
root=pathlib.Path(sys.argv[1]).resolve();root.mkdir(parents=True,exist_ok=True)
evidence=pathlib.Path(__file__).resolve().parents[2]/'docs/evidence/viral12/voice20'
for item in json.loads((evidence/'model-manifest.json').read_text()):
 folder='kokoro' if item['repo'].startswith('hexgrad/') else 'chatterbox'
 path=root/folder/pathlib.Path(item['file']).name;path.parent.mkdir(exist_ok=True)
 if not path.exists():
  temporary=path.with_suffix(path.suffix+'.part')
  with urllib.request.urlopen(f"https://huggingface.co/{item['repo']}/resolve/{item['revision']}/{item['file']}",timeout=180) as response,temporary.open('wb') as output:
   while chunk:=response.read(1024*1024):output.write(chunk)
  if hashlib.sha256(temporary.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Model hash mismatch: '+str(path))
  temporary.rename(path)
 if hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Model hash mismatch: '+str(path))
 print('VERIFIED',path,flush=True)
import torch,soundfile as sf
from kokoro import KModel,KPipeline
torch.set_num_threads(2);torch.manual_seed(42)
model=KModel(config=str(root/'kokoro/config.json'),model=str(root/'kokoro/kokoro-v1_0.pth')).eval()
refs=root/'chatterbox/references';refs.mkdir(exist_ok=True)
provenance=[]
for item,lang in zip(json.loads((evidence/'reference-provenance.json').read_text()),['a','b']):
 voice=item['voice'];pipeline=KPipeline(lang_code=lang,model=model)
 embedding=torch.load(root/f'kokoro/{voice}.pt',weights_only=True)
 with torch.inference_mode():audio=torch.cat([r.audio for r in pipeline(item['text'],voice=embedding,speed=1)]).numpy()
 path=refs/(voice+'.wav');sf.write(path,audio,24000,subtype='PCM_16')
 item['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();provenance.append(item)
(refs/'provenance.json').write_text(json.dumps(provenance,indent=2))
print('References are synthetic. Review new takes; do not auto-approve a profile.')
