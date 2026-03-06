import express from 'express'
import multer from 'multer'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'
import ffmpegStatic from 'ffmpeg-static'
import { spawn } from 'child_process'

// Get ffmpeg path
const ffmpegPath = ffmpegStatic || '/usr/bin/ffmpeg'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT) || 3000
const WHISPER_URL = process.env.WHISPER_URL || 'http://whisper-vllm:8001'
const ULTRAVOX_URL = process.env.ULTRAVOX_URL || 'http://ultravox-vllm:8002'
const KOKORO_URL = process.env.KOKORO_URL || 'http://kokoro-tts:8003'
const ULTRAVOX_MODEL_NAME = process.env.ULTRAVOX_MODEL_NAME || 'ultravox'

console.log('[Config] PORT:', PORT)
console.log('[Config] WHISPER_URL:', WHISPER_URL)
console.log('[Config] ULTRAVOX_URL:', ULTRAVOX_URL)
console.log('[Config] ULTRAVOX_MODEL_NAME:', ULTRAVOX_MODEL_NAME)
console.log('[Config] KOKORO_URL:', KOKORO_URL)

// Parse JSON bodies
app.use(express.json())

// Serve static files from dist
app.use(express.static(path.join(__dirname, '../dist')))

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp')
  },
  filename: (req, file, cb) => {
    cb(null, `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`)
  }
})
const upload = multer({ storage })

interface MulterRequest extends express.Request {
  file?: Express.Multer.File
}

// Create temp file
const createTempFile = (): string => {
  return path.join(os.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
}

// Convert buffer to WAV using ffmpeg
const convertToWav = async (audioBuffer: Buffer): Promise<Buffer> => {
  const inputPath = createTempFile() + '.webm'
  const outputPath = createTempFile() + '.wav'

  return new Promise((resolve, reject) => {
    // Write input file
    fs.writeFileSync(inputPath, audioBuffer)

    // Spawn ffmpeg process
    const ffmpegProcess = spawn(ffmpegPath, [
      '-i', inputPath,
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      outputPath
    ])

    let stderr = ''
    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        console.log('[FFmpeg] Konvertering klar')
        const wavBuffer = fs.readFileSync(outputPath)
        // Cleanup
        fs.unlinkSync(inputPath)
        fs.unlinkSync(outputPath)
        resolve(wavBuffer)
      } else {
        console.error('[FFmpeg] Konverteringsfel, exit code:', code)
        console.error('[FFmpeg] stderr:', stderr)
        // Cleanup
        try { fs.unlinkSync(inputPath) } catch { }
        try { fs.unlinkSync(outputPath) } catch { }
        reject(new Error(`ffmpeg exited with code ${code}`))
      }
    })

    ffmpegProcess.on('error', (err) => {
      console.error('[FFmpeg] Process error:', err)
      // Cleanup
      try { fs.unlinkSync(inputPath) } catch { }
      try { fs.unlinkSync(outputPath) } catch { }
      reject(err)
    })
  })
}

app.post('/api/transcribe', upload.single('file'), async (req: MulterRequest, res: express.Response) => {
  console.log('[Transcribe] Mottog fil:', req.file?.originalname || 'ingen fil')

  if (!req.file) {
    console.log('[Transcribe] FEL: Ingen fil uppladdad')
    return res.status(400).json({ error: 'No file uploaded' })
  }

  // Get language from request or default to auto-detect
  const requestedLanguage = (req.body.language as string) || ''
  const language = requestedLanguage || undefined // undefined = auto-detect

  console.log('[Transcribe] Filstorlek:', req.file.size, 'bytes')
  console.log('[Transcribe] Original format:', req.file.mimetype)
  console.log('[Transcribe] Tempfil:', req.file.path)
  console.log('[Transcribe] Skickar till Whisper:', WHISPER_URL)
  console.log('[Transcribe] Language:', language || 'auto-detect')

  // Read file from disk
  const audioBuffer = fs.readFileSync(req.file.path)

  // Convert WebM/Opus to WAV if needed
  if (req.file.mimetype.includes('webm') || req.file.mimetype.includes('ogg')) {
    console.log('[Transcribe] Konverterar WebM/OGG till WAV...')
    const convertStart = Date.now()
    try {
      const wavBuffer = await convertToWav(audioBuffer)
      console.log('[Transcribe] Konvertering klar på', Date.now() - convertStart, 'ms')
      console.log('[Transcribe] WAV storlek:', wavBuffer.length, 'bytes')
      // Use WAV buffer for Whisper
      const formData = new FormData()
      formData.append('file', new Blob([wavBuffer as unknown as BlobPart]), 'audio.wav')
      formData.append('model', 'whisper-large-v3')
      if (language) formData.append('language', language)
      formData.append('response_format', 'json')

      const startTime = Date.now()
      const response = await fetch(`${WHISPER_URL}/v1/audio/transcriptions`, {
        method: 'POST',
        body: formData
      })
      const duration = Date.now() - startTime

      console.log('[Transcribe] Whisper svarade med status:', response.status, `(${duration}ms)`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Transcribe] FEL från Whisper:', response.status, errorText)
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('[Transcribe] Framgång! Text:', data.text?.substring(0, 50) + '...')
      res.json(data)
      return
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message.substring(0, 50) : String(err)
      console.error('[Transcribe] Konvertering misslyckades:', errorMsg)
    }
  }

  // Fallback: send original file
  const filename = req.file.mimetype.includes('webm') ? 'recording.webm' : 'audio.wav'
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer as unknown as BlobPart]), filename)
  formData.append('model', 'whisper-large-v3')
  if (language) formData.append('language', language)
  formData.append('response_format', 'json')

  try {
    const startTime = Date.now()
    const response = await fetch(`${WHISPER_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      body: formData
    })
    const duration = Date.now() - startTime

    console.log('[Transcribe] Whisper svarade med status:', response.status, `(${duration}ms)`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Transcribe] FEL från Whisper:', response.status, errorText)
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[Transcribe] Framgång! Text:', data.text?.substring(0, 50) + '...')
    res.json(data)
  } catch (error) {
    console.error('[Transcribe] FEL:', error instanceof Error ? error.message : error)
    res.status(500).json({ error: 'Failed to transcribe audio', details: error instanceof Error ? error.message : String(error) })
  } finally {
    // Cleanup temp file
    try {
      fs.unlinkSync(req.file.path)
    } catch { }
  }
})

// Health check endpoint - testar anslutning till Whisper och Ultravox
app.get('/api/health', async (req: express.Request, res: express.Response) => {
  console.log('[Health] Checkar anslutningar...')

  const checkService = async (url: string, timeout = 5000) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const resp = await fetch(`${url}/v1/models`, { signal: controller.signal })
      clearTimeout(id)
      return resp.ok
    } catch (e) {
      clearTimeout(id)
      return false
    }
  }

  const whisperOk = await checkService(WHISPER_URL)
  const ultravoxOk = await checkService(ULTRAVOX_URL)
  const kokoroOk = await checkService(KOKORO_URL)

  res.json({
    status: whisperOk && ultravoxOk && kokoroOk ? 'healthy' : 'degraded',
    whisper_connected: whisperOk,
    ultravox_connected: ultravoxOk,
    kokoro_connected: kokoroOk,
    whisper: { url: WHISPER_URL, connected: whisperOk },
    ultravox: { url: ULTRAVOX_URL, connected: ultravoxOk },
    kokoro: { url: KOKORO_URL, connected: kokoroOk }
  })
})

// --- TTS Endpoint (Kokoro Proxy) ---
app.post('/api/tts', async (req: express.Request, res: express.Response) => {
  try {
    const { text, voice = 'af_heart' } = req.body
    if (!text) return res.status(400).json({ error: 'No text provided' })

    console.log(`[TTS] Request: "${text.substring(0, 30)}..." Voice: ${voice}`)

    const response = await fetch(`${KOKORO_URL}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: 1.0
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[TTS] Error: ${errText}`)
      throw new Error(`TTS API failed: ${errText}`)
    }

    res.setHeader('Content-Type', 'audio/mpeg')
    const arrayBuffer = await response.arrayBuffer()
    res.send(Buffer.from(arrayBuffer))
  } catch (err) {
    console.error('[TTS] Proxy Error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// Proxy endpoint för chat - skickar vidare till vllm
app.post('/api/chat', async (req: express.Request, res: express.Response) => {
  const { apiUrl, modelName, messages } = req.body

  if (!apiUrl || !modelName || !messages) {
    return res.status(400).json({ error: 'Missing required fields: apiUrl, modelName, messages' })
  }

  console.log('[Chat] Forwarding to:', apiUrl, 'Model:', modelName)

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content
        })),
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Chat] Error from API:', response.status, errorText)
      return res.status(response.status).json({
        error: 'Chat API error',
        details: errorText
      })
    }

    const data = await response.json()
    console.log('[Chat] Success! Response received')
    res.json(data)
  } catch (error) {
    console.error('[Chat] Error:', error instanceof Error ? error.message : error)
    res.status(500).json({
      error: 'Failed to forward chat request',
      details: error instanceof Error ? error.message : String(error)
    })
  }
})

// Native Multimodal Chat - handles audio OR text for Ultravox
app.post('/api/chat/native', upload.single('file'), async (req: MulterRequest, res: express.Response) => {
  console.log('[NativeChat] Request received')

  const prompt = (req.body.prompt as string) || "User is speaking."
  const systemPrompt = (req.body.systemPrompt as string) || "You are Autoversio Native Agent, a state-of-the-art multimodal AI. You hear the user directly. Always respond concisely and accurately in the same language as the user (default to Swedish if unsure). Maintain a professional yet helpful tone. If you receive audio, it is the primary source of truth."

  try {
    let content: any[] = [{ type: 'text', text: prompt }]

    if (req.file) {
      console.log('[NativeChat] Processing audio input...')
      const audioBuffer = fs.readFileSync(req.file.path)
      let finalBuffer = audioBuffer as any

      if (req.file.mimetype.includes('webm') || req.file.mimetype.includes('ogg')) {
        console.log('[NativeChat] Konverterar till WAV för Ultravox...')
        finalBuffer = await convertToWav(audioBuffer)
      }

      content.push({
        type: 'input_audio',
        input_audio: {
          data: (finalBuffer as Buffer).toString('base64'),
          format: 'wav'
        }
      })
    } else {
      console.log('[NativeChat] Processing text-only input.')
    }

    if (!prompt && !req.file) {
      return res.status(400).json({ error: 'No prompt or audio file provided' })
    }

    // Construct multimodal payload with a strong system prompt to stabilize behavior
    const payload = {
      model: ULTRAVOX_MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: content
        }
      ],
      stream: false,
      max_tokens: 512, // Reduced for speed
      temperature: 0.2 // More deterministic to avoid hallucinations
    }

    const startTime = Date.now()
    const response = await fetch(`${ULTRAVOX_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const duration = Date.now() - startTime

    console.log('[NativeChat] Ultravox svarade med status:', response.status, `(${duration}ms)`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[NativeChat] FEL från Ultravox:', response.status, errorText)
      throw new Error(`Ultravox API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[NativeChat] Ultravox Response:', JSON.stringify(data, null, 2))

    if (data.error) {
      console.error('[NativeChat] Ultravox returnerade ett inbäddat fel:', data.error.message)
      throw new Error(`Ultravox Error: ${data.error.message}`)
    }

    if (!data.choices || data.choices.length === 0) {
      console.warn('[NativeChat] Warning: Ultravox returned no choices!')
    } else if (!data.choices[0].message?.content) {
      console.warn('[NativeChat] Warning: Ultravox returned empty content!')
    }

    console.log('[NativeChat] Framgång!')
    res.json(data)
  } catch (error) {
    console.error('[NativeChat] FEL:', error instanceof Error ? error.message : error)
    res.status(500).json({
      error: 'Failed to process native multimodal chat',
      details: error instanceof Error ? error.message : String(error)
    })
  } finally {
    // Cleanup
    if (req.file) {
      try { fs.unlinkSync(req.file.path) } catch { }
    }
  }
})

// Serve index.html for all other routes (SPA support)
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Körs på port ${PORT}`)
  console.log(`Whisper URL: ${WHISPER_URL}`)
  console.log(`Ultravox URL: ${ULTRAVOX_URL}`)
})
