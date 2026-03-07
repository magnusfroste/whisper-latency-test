# Autoversio Privacy Chat Node

<div align="center">

🔒 **100% Local & Private** · 🎙️ **STT → LLM → TTS** · 🧠 **Native Multimodal** · 🇸🇪🇬🇧 **Multilingual**

---

*One of the most complete open-source, self-hosted voice AI stacks available.*  
*Your data never leaves your server. Not a single byte.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-20232a?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![vLLM](https://img.shields.io/badge/vLLM-Powered-orange?style=flat)](https://docs.vllm.ai)

---

</div>

## What is this?

**Autoversio Intelligence Node** is a complete, self-hosted voice AI powerhouse. It bundles best-in-class open-source models into a single deployable stack — giving you the power of a modern voice assistant with full data sovereignty and zero cloud dependencies.

> **Speak → Think → Speak back.** All on your own hardware.

---

## 🏗 The Full Stack

| Layer | Technology | Role |
|---|---|---|
| **STT** | [Whisper Large v3](https://huggingface.co/openai/whisper-large-v3) via vLLM | Speech → Text |
| **LLM** | Any OpenAI-compatible model (Qwen, Llama, etc.) via vLLM | Reasoning & Response |
| **Native Audio LLM** | [Ultravox v0.5](https://huggingface.co/fixie-ai/ultravox-v0_5-llama-3_1-8b) via vLLM | Audio → Text (no STT bottleneck) |
| **TTS (EN)** | [Kokoro-82M](https://github.com/remsky/kokoro-fastapi) (ONNX CPU) | Text → Natural English Speech |
| **TTS (SV)** | [Piper](https://github.com/rhasspy/piper) (`sv_SE-nst-medium`) | Text → Native Swedish Speech |
| **Frontend** | React 18 + TypeScript + Vite | Premium dark UI |
| **Backend** | Node.js + Express | API Proxy & Audio processing |

---

## 🎯 Two Voice Interaction Modes

### 🗣️ STT Agent (Explicit Pipeline)
The classic voice pipeline — maximum compatibility and control.
```
Voice → Whisper (STT) → LLM → Kokoro/Piper (TTS) → Audio
```
- Hold `SPACE` or click the mic to record
- Whisper transcribes → LLM reasons → TTS speaks back
- Personality modes: Standard, Sycophant, Formal, Rude
- Voice output with **auto language detection** (EN → Kokoro, SV → Piper)

### 🧠 Native Agent (Multimodal Pipeline)
Zero transcription overhead — audio goes directly to Ultravox.
```
Voice → Ultravox (Audio LLM) → Kokoro/Piper (TTS) → Audio
```
- Audio is processed natively as weights — no STT step
- Lower latency, better prosody understanding
- Same voice output controls as STT Agent

---

## 🔊 Multilingual TTS

The system automatically selects the right voice engine per response:

| Language | Engine | Voice | Quality |
|---|---|---|---|
| 🇬🇧 English | **Kokoro** (82M ONNX) | `af_heart` | ⭐⭐⭐⭐⭐ Natural, expressive |
| 🇸🇪 Swedish | **Piper** | `sv_SE-nst-medium` | ⭐⭐⭐⭐ Native accent |

Toggle: **Auto** (detects `å/ä/ö` and Swedish words) · **🇬🇧** · **🇸🇪**

---

## 🛠 Features

- **Full Voice Loop**: Talk → get a spoken response, no typing required
- **Privacy by Design**: Zero telemetry, zero cloud. Self-hosted everything.
- **GDPR Ready**: Data never leaves your infrastructure
- **Sleek Dark UI**: Grok-inspired premium interface  
- **Personality System**: Customize agent tone per conversation
- **Real-time Transcription**: Live transcribe mode for long-form audio
- **WebSocket Stream**: Lowest-latency transcription pipeline
- **Health Dashboard**: Live status of all services + Compliance view
- **Auto Language Detection**: TTS engine auto-selected from response content

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- NVIDIA GPU (recommended for Whisper + Ultravox)
- Node.js 20+ (local development)

### Deploy with EasyPanel / Docker Compose

**Full AI stack** (Whisper + Ultravox + Kokoro + Piper):
```bash
docker-compose -f docker-compose.vllm.yml up -d
```

**App only** (connects to existing AI services):
```bash
docker-compose up -d
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Web server port | `3000` |
| `WHISPER_URL` | Whisper vLLM endpoint | `http://whisper-vllm:8001` |
| `ULTRAVOX_URL` | Ultravox vLLM endpoint | `http://ultravox-vllm:8002` |
| `KOKORO_URL` | Kokoro TTS endpoint | `http://kokoro-tts:8003` |
| `PIPER_URL` | Piper TTS endpoint | `http://piper-tts:8004` |
| `ULTRAVOX_MODEL_NAME` | Ultravox model ID | `ultravox` |
| `VITE_CHAT_API_URL` | LLM API (OpenAI-compatible) | `http://172.17.0.1:8000/v1` |
| `VITE_CHAT_MODEL_NAME` | LLM model name | `autoversio` |

---

## 📐 Architecture

```mermaid
graph TD
    User((👤 User)) -->|Voice| App[React Frontend]
    App -->|Audio WebM| Server[Node.js Proxy]

    subgraph Explicit Pipeline
        Server -->|WAV| Whisper[Whisper Large v3\nvLLM · Port 8001]
        Whisper -->|Text| LLM[LLM\nvLLM · Port 8000]
    end

    subgraph Native Pipeline
        Server -->|Audio| Ultravox[Ultravox v0.5\nvLLM · Port 8002]
    end

    LLM -->|Text Response| TTS
    Ultravox -->|Text Response| TTS

    subgraph TTS Engine
        TTS{Auto Detect\nEN / SV}
        TTS -->|English| Kokoro[Kokoro 82M\nONNX CPU · Port 8003]
        TTS -->|Swedish| Piper[Piper NST\nCPU · Port 8004]
    end

    Kokoro -->|Audio| App
    Piper -->|Audio| App
    App -->|🔊 Spoken Response| User
```

---

## 🛡 Privacy & Compliance

- **No external API calls** made by the application itself
- **No tracking, analytics, or telemetry** of any kind
- **Audio processed in-memory** and deleted immediately after transcription
- **Self-hosted models** — weights run on your hardware, your network
- Suitable for **GDPR**, **HIPAA**, and **NIS2** compliance contexts

---

## 📦 Services Overview

| Service | Image | Port | GPU |
|---|---|---|---|
| `app` | `Dockerfile.app` | 3000 | ❌ |
| `whisper-vllm` | `Dockerfile.whisper-vllm` | 8001 | ✅ |
| `ultravox-vllm` | `vllm/vllm-openai` | 8002 | ✅ |
| `kokoro-tts` | `ghcr.io/remsky/kokoro-fastapi-cpu` | 8003 | ❌ CPU |
| `piper-tts` | `Dockerfile.piper` | 8004 | ❌ CPU |

---

## 📡 API Reference

All services expose **OpenAI-compatible REST APIs**. They can be called directly or via the Node.js proxy at `http://your-server:3000`.

---

### 1. Whisper — Speech-to-Text  
**Endpoint:** `POST http://your-server:8001/v1/audio/transcriptions`  
**Model:** `openai/whisper-large-v3`

```bash
curl -X POST http://your-server:8001/v1/audio/transcriptions \
  -F "file=@audio.wav" \
  -F "model=whisper-large-v3" \
  -F "response_format=json" \
  -F "language=sv"   # optional, omit for auto-detect
```

```json
{
  "text": "Hej världen, detta är ett test."
}
```

| Parameter | Type | Description |
|---|---|---|
| `file` | binary | Audio file (WAV, WebM, MP3, etc.) |
| `model` | string | `whisper-large-v3` |
| `language` | string | ISO 639-1 code (`sv`, `en`, ...) or omit for auto |
| `response_format` | string | `json` (default), `text`, `verbose_json` |

---

### 2. LLM (Qwen / vLLM) — Text Chat  
**Endpoint:** `POST http://your-server:8000/v1/chat/completions`  
**Model:** `Qwen/Qwen2.5-32B-Instruct` (or whichever model you serve)

```bash
curl -X POST http://your-server:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-32B-Instruct",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user",   "content": "Explain quantum entanglement simply." }
    ],
    "temperature": 0.7,
    "max_tokens": 512
  }'
```

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "Qwen/Qwen2.5-32B-Instruct",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Quantum entanglement is..." },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 25, "completion_tokens": 80, "total_tokens": 105 }
}
```

| Parameter | Type | Description |
|---|---|---|
| `model` | string | Served model name |
| `messages` | array | Conversation history (role + content) |
| `temperature` | float | 0.0–2.0, creativity control |
| `max_tokens` | int | Max output tokens |
| `stream` | bool | Enable SSE streaming |

---

### 3. Ultravox — Native Audio Chat  
**Endpoint:** `POST http://your-server:8002/v1/chat/completions`  
**Model:** `fixie-ai/ultravox-v0_5-llama-3_1-8b` (served as `ultravox`)

Ultravox accepts raw audio as base64 alongside text — no STT step needed.

```bash
# Encode audio to base64 first
AUDIO_B64=$(base64 -i audio.wav | tr -d '\n')

curl -X POST http://your-server:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"ultravox\",
    \"messages\": [
      { \"role\": \"system\", \"content\": \"You are a helpful assistant. Always respond in the same language as the user.\" },
      {
        \"role\": \"user\",
        \"content\": [
          { \"type\": \"text\", \"text\": \"User is speaking.\" },
          { \"type\": \"input_audio\", \"input_audio\": { \"data\": \"$AUDIO_B64\", \"format\": \"wav\" } }
        ]
      }
    ],
    \"max_tokens\": 512,
    \"temperature\": 0.2
  }"
```

```json
{
  "model": "ultravox",
  "choices": [{
    "message": { "role": "assistant", "content": "Hej! Hur kan jag hjälpa dig?" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 114, "completion_tokens": 12, "total_tokens": 126 }
}
```

| Content type | Description |
|---|---|
| `text` | Prompt/context text |
| `input_audio` | Base64-encoded WAV audio with `format: "wav"` |

---

### 4. Kokoro — English TTS  
**Endpoint:** `POST http://your-server:8003/v1/audio/speech`  
**Model:** `kokoro` (Kokoro-82M ONNX)

```bash
curl -X POST http://your-server:8003/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kokoro",
    "input": "Hello! How can I help you today?",
    "voice": "af_heart",
    "response_format": "mp3",
    "speed": 1.0
  }' \
  --output speech.mp3
```

**Available voices:**

| Voice ID | Description |
|---|---|
| `af_heart` | American Female — warm, natural (recommended) |
| `af_sarah` | American Female — clear |
| `af_bella` | American Female — expressive |
| `am_adam` | American Male |
| `am_michael` | American Male — deep |
| `bf_emma` | British Female |
| `bm_george` | British Male |

---

### 5. Piper — Swedish (+ English) TTS  
**Endpoint:** `POST http://your-server:8004/v1/audio/speech`  
**Model:** `piper`

```bash
curl -X POST http://your-server:8004/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "piper",
    "input": "Hej! Hur kan jag hjälpa dig idag?",
    "voice": "sv_SE-nst-medium",
    "response_format": "wav"
  }' \
  --output speech.wav
```

**Available voices (pre-loaded):**

| Voice ID | Language | Description |
|---|---|---|
| `sv_SE-nst-medium` | 🇸🇪 Swedish | Native Swedish NST voice |
| `en_US-lessac-medium` | 🇬🇧 English | Clear American English |

Returns raw **WAV** audio. The Piper service exposes the same `/v1/audio/speech` interface as Kokoro for drop-in compatibility.

---

### 6. App Proxy Endpoints  
The Node.js app at port `3000` also exposes these convenience endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/transcribe` | Proxy to Whisper (handles WebM→WAV conversion) |
| `POST` | `/api/chat` | Proxy to any OpenAI-compatible LLM |
| `POST` | `/api/chat/native` | Proxy to Ultravox (handles audio encoding) |
| `POST` | `/api/tts` | Smart TTS proxy (routes to Kokoro or Piper) |
| `GET` | `/api/health` | Status of all connected services |

**`/api/tts` engine routing:**
```json
{
  "text": "Hej världen",
  "voice": "sv_SE-nst-medium",
  "engine": "piper"
}
```
Set `engine` to `"kokoro"` or `"piper"`. The frontend uses auto-detection based on response language.

---

## About Autoversio

**[Autoversio](https://www.autoversio.ai)** is a Swedish AI provider offering flexible deployment options:
- **Semi-Local**: Cloud-hosted in Sweden for compliance and performance
- **Fully On-Prem**: Complete data sovereignty with dedicated hardware

---

<p align="center">
  <strong>© 2025 Magnus Froste · Built with ❤️ for the open-source community</strong><br>
  <a href="https://www.autoversio.ai">autoversio.ai</a> · <a href="https://opensource.org/licenses/MIT">MIT License</a>
</p>
