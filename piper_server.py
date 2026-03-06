import subprocess
import struct
import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI()

VOICES_DIR = "/app/voices"
PIPER_BIN = "/usr/local/bin/piper/piper"

# Map voice name -> (onnx_path, sample_rate)
VOICE_CONFIGS: dict = {}

def load_voice_configs():
    for fname in os.listdir(VOICES_DIR):
        if fname.endswith(".onnx.json"):
            voice_name = fname.replace(".onnx.json", "")
            json_path = os.path.join(VOICES_DIR, fname)
            onnx_path = os.path.join(VOICES_DIR, fname.replace(".json", ""))
            if os.path.exists(onnx_path):
                with open(json_path) as f:
                    cfg = json.load(f)
                sample_rate = cfg.get("audio", {}).get("sample_rate", 22050)
                VOICE_CONFIGS[voice_name] = {"path": onnx_path, "sample_rate": sample_rate}
    print(f"[Piper] Loaded voices: {list(VOICE_CONFIGS.keys())}")

load_voice_configs()

def make_wav_header(data_size: int, sample_rate: int = 22050) -> bytes:
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    header = b"RIFF"
    header += struct.pack("<I", data_size + 36)
    header += b"WAVEfmt "
    header += struct.pack("<I", 16)
    header += struct.pack("<H", 1)  # PCM
    header += struct.pack("<H", num_channels)
    header += struct.pack("<I", sample_rate)
    header += struct.pack("<I", byte_rate)
    header += struct.pack("<H", block_align)
    header += struct.pack("<H", bits_per_sample)
    header += b"data"
    header += struct.pack("<I", data_size)
    return header

class SpeechRequest(BaseModel):
    model: str = "piper"
    input: str
    voice: str = "sv_SE-nst-medium"
    response_format: str = "wav"
    speed: float = 1.0

@app.post("/v1/audio/speech")
async def synthesize(req: SpeechRequest):
    voice_name = req.voice
    if voice_name not in VOICE_CONFIGS:
        # Fallback to first available voice
        if not VOICE_CONFIGS:
            raise HTTPException(503, "No voices available")
        voice_name = list(VOICE_CONFIGS.keys())[0]
        print(f"[Piper] Voice '{req.voice}' not found, using '{voice_name}'")

    cfg = VOICE_CONFIGS[voice_name]
    try:
        result = subprocess.run(
            [PIPER_BIN, "--model", cfg["path"], "--output_raw", "--sentence_silence", "0.2"],
            input=req.input.encode("utf-8"),
            capture_output=True,
            timeout=30
        )
        if result.returncode != 0:
            raise HTTPException(500, f"Piper error: {result.stderr.decode()}")

        raw_audio = result.stdout
        wav = make_wav_header(len(raw_audio), cfg["sample_rate"]) + raw_audio
        return Response(content=wav, media_type="audio/wav")
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Piper synthesis timed out")
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/v1/models")
def list_models():
    return {"object": "list", "data": [{"id": "piper"}]}

@app.get("/health")
def health():
    return {"status": "ok", "voices": list(VOICE_CONFIGS.keys())}
