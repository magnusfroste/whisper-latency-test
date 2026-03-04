# Whisper Latency Test

A benchmarking application for comparing local private AI models against closed paid models. This project focuses on measuring latency and performance of Whisper speech-to-text models running locally versus cloud-based alternatives.

## Project Goal

The primary objective of this project is to benchmark local private models against closed paid models, evaluating:
- **Latency**: Response times for speech-to-text transcription
- **Privacy**: Ensuring all audio processing happens locally without data leaving your environment
- **Accuracy**: Comparing transcription quality between different models
- **Cost**: Evaluating the economic benefits of self-hosted solutions

## Features

- **Push-to-Talk**: Simple press-and-hold interface for instant transcription
- **Live Transcription**: Continuous transcription while recording
- **Real-time Transcription**: Near real-time updates (under development)
- **Privacy First**: All audio processing happens locally - no data sent to third parties
- **Performance Metrics**: Detailed latency measurements for each transcription

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Speech-to-Text**: OpenAI Whisper (self-hosted)
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
git clone https://github.com/magnusfroste/whisper-latency-test.git
cd whisper-latency-test
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

1. Open the application in your browser
2. Click "Get Started" on the landing page
3. Press and hold the microphone button while speaking
4. Release to see the transcription and latency metrics
5. Compare results across different modes and configurations

## Benchmarking

To run benchmarks:
1. Use consistent test phrases across all models
2. Record latency measurements
3. Evaluate transcription accuracy manually
4. Compare costs between self-hosted and cloud solutions

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
