# Whisper Latens-test

En minimal webbapp för att testa Speech-to-Text latens med Whisper. Håll inne knappen för att tala, släpp för att transkribera, och se resultatet med latens i millisekunder.

## Funktioner

- Push-to-talk inspelning med mikrofon
- Latens-mätning från knappsläpp till svar
- Färgkodad latensindikator:
  - Grön: < 500ms
  - Gul: 500-1000ms
  - Röd: > 1000ms
- Historik med senaste 10 transkriptioner

## Filstruktur

```
/
├── src/
│   └── App.tsx              # Frontend: push-to-talk, MediaRecorder
├── server/
│   └── index.ts             # Express: serve dist/ + proxy /api/transcribe
├── .github/workflows/
│   └── docker-build.yml     # CI: bygg och pusha till ghcr.io
├── docker-compose.yml       # Köra båda servrarna
├── Dockerfile               # Whisper test-app
├── Dockerfile.whisper-vllm  # Whisper VLLM med audio support
├── package.json
├── vite.config.ts
└── README.md
```

## Krav

### Produktion
- **HTTPS krävs** för mikrofonåtkomst i webbläsaren
- GPU med NVIDIA driver för Whisper VLLM

## Lokal utveckling

```bash
# Installera beroenden
npm install

# Bygg frontend
npm run build

# Starta server
npm run server
```

Öppna http://localhost:3000 i webbläsaren.

## Lokalt med Docker

### Bygg båda images
```bash
# Test-app
docker build -t whisper-test .

# Whisper VLLM
docker build -t whisper-vllm -f Dockerfile.whisper-vllm .
```

### Starta servrarna
```bash
# Whisper VLLM (kräver GPU)
docker run -d --gpus all -p 8001:8001 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -e HUGGINGFACE_TOKEN=din-token \
  whisper-vllm

# Test-app
docker run -d -p 3000:3000 \
  -e WHISPER_URL=http://host.docker.internal:8001 \
  whisper-test
```

## Bygg enbart test-appen

```bash
docker build -t whisper-test .
docker run -p 3000:3000 -e WHISPER_URL=http://whisper-vllm:8001 whisper-test
```

## Deploy till EasyPanel

### 1. Whisper VLLM (Docker-app)
1. Skapa en ny Docker-app
2. Använd `Dockerfile.whisper-vllm`
3. Sätt environment variables:
   - `HUGGINGFACE_TOKEN`: Din HF token
4. Exponera port 8001
5. **Viktigt:** Aktivera GPU support (NVIDIA driver)
6. Command (optional, default är redan inställd):
   ```
   openai/whisper-large-v3 --port 8001 --gpu-memory-utilization 0.45
   ```

### 2. Test-app (Docker-app)
1. Skapa en ny Docker-app
2. Använd `Dockerfile` (i roten)
3. Sätt environment variable:
   - `WHISPER_URL=http://whisper-vllm:8001` (eller IP:port till VLLM)
4. Exponera port 3000
5. Se till att appen är tillgänglig via HTTPS för mikrofonåtkomst

**Tips:** Om apparna är i samma EasyPanel stack/network kan du använda servicenamnet `whisper-vllm` i `WHISPER_URL`. Annars använd IP-adress.

## GitHub Actions

Vid push till `main` branch bygger och pushar GitHub Actions automatiskt Docker images till GitHub Container Registry (ghcr.io).

- Test-app: `ghcr.io/{owner}/{repo}:{commit_sha}`
- Whisper VLLM: `ghcr.io/{owner}/{repo}-vllm:{commit_sha}`

## Miljövariabler

| Variabel | Beskrivning | Standard |
|----------|-------------|----------|
| `HF_TOKEN` | Hugging Face token för model download | - |
| `WHISPER_URL` | URL till Whisper VLLM-server | `http://whisper-vllm:8001` |
| `PORT` | Port för test-appen | `3000` |

