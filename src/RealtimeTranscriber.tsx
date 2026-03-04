import { useState, useRef, useEffect } from 'react'

interface RealtimeTranscriberProps {
  onBack: () => void
}

interface HealthStatus {
  status: string
  whisper_connected: boolean
  whisper_latency_ms?: number
  error?: string
}

export default function RealtimeTranscriber({ onBack }: RealtimeTranscriberProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const lastSendTimeRef = useRef<number>(0)

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealth(data)
    } catch (err) {
      setHealth({
        status: 'unhealthy',
        whisper_connected: false,
        error: 'Kunde inte nå Whisper'
      })
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      chunksRef.current = []
      setTranscribedText('')
      setError(null)
      lastSendTimeRef.current = 0

      // Collect chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(3000) // Get chunks every 3 seconds
      setIsRecording(true)
    } catch (err) {
      setError('Kunde inte tillgripa mikrofonen.')
      console.error('Microphone error:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Send chunks periodically
  useEffect(() => {
    if (!isRecording) return

    const interval = setInterval(async () => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []

        try {
          const formData = new FormData()
          formData.append('file', blob, 'recording.webm')

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          })

          if (response.ok) {
            const data = await response.json()
            setTranscribedText(prev => {
              const newText = prev && !data.text.startsWith(prev)
                ? prev + ' ' + data.text
                : data.text
              console.log('[Realtime] Text:', newText.substring(0, 50))
              return newText
            })
          }
        } catch (err) {
          console.warn('[Realtime] Transkriberingsfel:', err)
        }
      }
    }, 2000) // Send chunks every 2 seconds for near-realtime

    return () => clearInterval(interval)
  }, [isRecording])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcribedText)
    alert('Text kopierad!')
  }

  const clearText = () => {
    setTranscribedText('')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            ← Tillbaka
          </button>
          <h1 className="text-2xl font-bold">Realtime Transkribering</h1>
          <div className="w-32" />
        </div>

        {/* Health Status */}
        <div className={`rounded-lg p-3 mb-6 border text-sm ${
          health?.whisper_connected
            ? 'bg-green-900/30 border-green-700'
            : 'bg-red-900/30 border-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              health?.whisper_connected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>Whisper: {health?.whisper_connected ? 'Ansluten' : 'Kopplad'}</span>
          </div>
        </div>

        {/* Recording Control */}
        <div className="flex justify-center mb-8">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-32 h-32 rounded-full flex items-center justify-center bg-green-600 hover:bg-green-500 transition-all shadow-lg"
            >
              <span className="text-lg font-semibold">Starta</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="relative w-32 h-32 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 transition-all shadow-lg"
            >
              <span className="absolute inset-0 rounded-full animate-pulse border-4 border-red-500" />
              <span className="text-lg font-semibold">Stoppa</span>
            </button>
          )}
        </div>

        {/* Status */}
        {isRecording && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Spelar in... (uppdateras var 2:a sekund)
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-center">
            {error}
          </div>
        )}

        {/* Text Display */}
        {transcribedText && (
          <div className="mb-6">
            <div className="flex gap-2 mb-3">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm"
              >
                Kopiera
              </button>
              <button
                onClick={clearText}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
              >
                Rensa
              </button>
            </div>
            <textarea
              readOnly
              className="w-full bg-gray-800 rounded-lg p-4 border border-gray-700 text-lg leading-relaxed text-white resize-none"
              rows={6}
              value={transcribedText}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="font-semibold mb-2">Instruktioner:</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Klicka "Starta" för att börja transkribera</li>
            <li>• Texten uppdateras automatiskt var 2:a sekund</li>
            <li>• Klicka "Stoppa" när du är klar</li>
            <li>• Kopiera eller rensa texten</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
