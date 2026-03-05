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
const PORT = process.env.PORT || 3000
const WHISPER_URL = process.env.WHISPER_URL || 'http://whisper-vllm:8001'
const ULTRAVOX_URL = process.env.ULTRAVOX_URL || 'http://ultravox-vllm:8002'

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

// Health check endpoint - testar anslutning till Whisper
app.get('/api/health', async (req: express.Request, res: express.Response) => {
  console.log('[Health] Checkar Whisper anslutning:', WHISPER_URL)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const startTime = Date.now()
    const response = await fetch(`${WHISPER_URL}/v1/models`, {
      method: 'GET',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    const duration = Date.now() - startTime

    if (response.ok) {
      const models = await response.json()
      console.log('[Health] OK! Whisper svarade på', duration, 'ms')
      return res.json({
        status: 'healthy',
        whisper_url: WHISPER_URL,
        whisper_connected: true,
        whisper_latency_ms: duration,
        models: models.data?.map((m: any) => m.id) || []
      })
    } else {
      console.error('[Health] Whisper svarade med status:', response.status)
      return res.status(503).json({
        status: 'unhealthy',
        whisper_url: WHISPER_URL,
        whisper_connected: false,
        error: `Whisper responded with status ${response.status}`
      })
    }
  } catch (error) {
    clearTimeout(timeoutId)
    console.error('[Health] KUNDE INTE nå Whisper:', error instanceof Error ? error.message : error)
    return res.status(503).json({
      status: 'unhealthy',
      whisper_url: WHISPER_URL,
      whisper_connected: false,
      error: error instanceof Error ? error.message : 'Kunde inte nå Whisper-servern'
    })
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

// Native Multimodal Chat - handles audio directly for Ultravox
app.post('/api/chat/native', upload.single('file'), async (req: MulterRequest, res: express.Response) => {
  console.log('[NativeChat] Mottog röstkommando för Ultravox')

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' })
  }

  const prompt = (req.body.prompt as string) || "User is speaking."
  console.log('[NativeChat] Prompt:', prompt)

  try {
    // Read file
    const audioBuffer = fs.readFileSync(req.file.path)
    let finalBuffer: Buffer = audioBuffer

    // Convert to WAV (Ultravox/vLLM expectations)
    if (req.file.mimetype.includes('webm') || req.file.mimetype.includes('ogg')) {
      console.log('[NativeChat] Konverterar till WAV för Ultravox...')
      finalBuffer = await convertToWav(audioBuffer)
    }

    // Convert to base64
    const audioBase64 = finalBuffer.toString('base64')

    // Construct multimodal payload
    const payload = {
      model: 'ultravox',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'audio',
              input_audio: {
                data: audioBase64,
                format: 'wav'
              }
            }
          ]
        }
      ],
      stream: false,
      max_tokens: 1024
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
    try { fs.unlinkSync(req.file.path) } catch { }
  }
})

// Serve index.html for all other routes (SPA support)
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Whisper URL: ${WHISPER_URL}`)
  console.log(`Ultravox URL: ${ULTRAVOX_URL}`)
})
