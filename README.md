# Private Whisper Agent

A privacy-first Whisper speech-to-text and agentic chat test platform. Compare different models and settings to optimize response times and user experience.

## Project Goal

This platform enables benchmarking and testing of local private AI models against various configurations, focusing on:
- **Privacy**: All audio processing happens locally - no data leaves your environment
- **Model Comparison**: Test different Whisper models and LLM configurations
- **Performance Optimization**: Measure and optimize latency and response quality
- **Agentic Chat**: Integrated voice-to-chat workflow with configurable backends

## Features

- **Push-to-Talk Transcription**: Simple press-and-hold interface for instant speech-to-text
- **Live Transcription**: Continuous real-time transcription while recording
- **Real-time Transcription**: Near real-time streaming updates (under development)
- **Agentic Chat**: Voice-enabled chat that transcribes audio and sends to configurable LLM backends
- **Privacy First**: All audio processing happens locally - no data sent to third parties
- **Performance Metrics**: Detailed latency measurements for each operation
- **Configurable Backends**: Easily swap between different Whisper and LLM endpoints

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Speech-to-Text**: OpenAI Whisper (self-hosted via vLLM)
- **Audio Processing**: FFmpeg for format conversion
- **Deployment**: Docker with EasyPanel

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- FFmpeg

### Installation

1. Clone the repository:
```bash
git clone https://github.com/magnusfroste/private-whisper-agent.git
cd private-whisper-agent
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build and run:
```bash
npm run build
npm run dev
```

## Usage

### Transcription Modes

1. **Push-to-Talk**: Hold the microphone button while speaking, release to transcribe
2. **Live Transcription**: Continuous transcription as you speak
3. **Realtime**: Streaming transcription with near real-time updates

### Agentic Chat

The chat feature combines voice transcription with LLM responses:

1. Click "Chat" to open the chat interface
2. Configure your backend settings (API URL and model name)
3. Use the microphone button to speak - your voice is transcribed and sent to the LLM
4. Or type messages directly
5. Receive responses from your configured model

The chat supports:
- Voice input (record → transcribe → send to LLM)
- Text input
- Configurable API endpoints and model names
- Session clearing

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Client    │────▶│   Server     │────▶│  Whisper/vLLM   │
│  (React)    │     │  (Express)   │     │  Transcription  │
└─────────────┘     └──────────────┘     └─────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   LLM Backend   │
                      │ (Qwen, etc.)    │
                      └─────────────────┘
```

## Benchmarking

To run benchmarks:
1. Use consistent test phrases across all models
2. Record latency measurements
3. Evaluate transcription accuracy manually
4. Compare costs between self-hosted and cloud solutions
5. Test different model configurations for optimal performance

## Docker Deployment

The project includes Docker configurations for easy deployment:

```bash
# Using docker-compose with Whisper + vLLM
docker-compose -f docker-compose.vllm.yml up -d

# Or use the main docker-compose
docker-compose up -d
```

## Environment Variables

Configure the following in your `.env` file:

- `PORT`: Server port (default: 3000)
- `WHISPER_URL`: Whisper/vLLM endpoint URL
- `VITE_CHAT_API_URL`: Default LLM API endpoint for chat
- `VITE_CHAT_MODEL_NAME`: Default model name for chat

## License

This project is licensed under the MIT License - see below for details.

## MIT License

Copyright (c) 2024 Magnus Froste

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## About

Built with ❤️ for the open-source community

## About Autoversio

**Autoversio** is a local Swedish provider offering flexible AI deployment options:

- **Semi-Local Transcription & LLM Services**: Cloud-hosted services with data processed in Sweden, combining convenience with privacy compliance
- **Fully Local On-Premises Solutions**: Complete on-premise deployment with hardware provision for maximum data sovereignty and offline capability

Whether you need semi-local services or fully on-premises deployment with dedicated hardware, Autoversio provides tailored AI solutions for organizations prioritizing data privacy and control.

Learn more: [www.autoversio.ai](https://www.autoversio.ai)

---

**Part of [PRIVAI](https://www.privai.se)** - Private AI solutions for everyone
