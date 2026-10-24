"""Optional Piper 1.3 subprocess: one CPU model, bounded JSON-lines IPC, no network."""
import base64
import io
import json
import sys
import wave
from pathlib import Path

import onnxruntime as ort
from piper import PiperVoice, SynthesisConfig
from piper.config import PiperConfig

model = Path(sys.argv[1]).resolve(strict=True)
if model.stat().st_size > 150_000_000:
    raise ValueError('Model exceeds 150 MB')
config = json.loads(Path(str(model) + '.json').read_text())
if config.get('language', {}).get('code') != 'pt_BR':
    raise ValueError('Requires a pt_BR model')
options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1
voice = PiperVoice(config=PiperConfig.from_dict(config), session=ort.InferenceSession(str(model), sess_options=options, providers=['CPUExecutionProvider']))
print(json.dumps({'ready': True}), flush=True)
for line in sys.stdin:
    try:
        if len(line) > 4096:
            raise ValueError('Request too long')
        request = json.loads(line)
        text = request['text']
        if not isinstance(text, str) or not 0 < len(text) <= 200 or '[[' in text:
            raise ValueError('Invalid text')
        # Distinct pacing, not a claim of distinct trained speakers or emotional synthesis.
        pace = {'host': 1.0, 'bright': .88, 'deep': 1.12}[request['voice']]
        output = io.BytesIO()
        with wave.open(output, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(voice.config.sample_rate)
            remaining = voice.config.sample_rate * 8 * 2
            for chunk in voice.synthesize(text, SynthesisConfig(length_scale=.9 if request.get('musical') else pace)):
                data = chunk.audio_int16_bytes[:remaining]
                wav.writeframes(data)
                remaining -= len(data)
                if remaining <= 0:
                    break
        print(json.dumps({'wav': base64.b64encode(output.getvalue()).decode('ascii')}), flush=True)
    except Exception:
        print(json.dumps({'error': 'Synthesis failed'}), flush=True)
