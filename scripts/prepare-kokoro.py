"""Operator-invoked download of reviewed official Kokoro weights; never runs in a live."""
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

root = Path(sys.argv[1]).resolve()
root.mkdir(parents=True, exist_ok=True)
manifest = Path(__file__).resolve().parents[1] / 'docs/evidence/viral12/kokoro-assets.json'
for asset in json.loads(manifest.read_text()):
    target = root / asset['path'].split('/')[-1]
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == asset['sha256']:
        continue
    with urllib.request.urlopen(asset['url'], timeout=180) as response:
        data = response.read(asset['bytes'] + 1)
    if len(data) != asset['bytes'] or hashlib.sha256(data).hexdigest() != asset['sha256']:
        raise ValueError('Upstream asset changed; review before installation: ' + asset['path'])
    temporary = target.with_suffix(target.suffix + '.partial')
    temporary.write_bytes(data)
    temporary.replace(target)
print('Verified Kokoro assets:', root)
