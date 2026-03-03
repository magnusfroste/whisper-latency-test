import express from 'express'
import multer from 'multer'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const WHISPER_URL = process.env.WHISPER_URL || 'http://whisper-vllm:8001'

// Serve static files from dist
app.use(express.static(path.join(__dirname, '../dist')))

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({ storage })

interface MulterRequest extends express.Request {
  file?: Express.Multer.File
}

app.post('/api/transcribe', upload.single('file'), async (req: MulterRequest, res: express.Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const formData = new FormData()
  formData.append('file', new Blob([req.file.buffer as unknown as BlobPart]), req.file.originalname)
  formData.append('model', 'openai/whisper-large-v3')
  formData.append('language', 'sv')
  formData.append('response_format', 'json')

  try {
    const response = await fetch(`${WHISPER_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).json({ error: 'Failed to transcribe audio' })
  }
})

// Serve index.html for all other routes (SPA support)
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Whisper URL: ${WHISPER_URL}`)
})
