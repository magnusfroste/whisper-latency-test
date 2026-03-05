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
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const isProcessingRef = useRef(false) // Use ref for mutable access in async callbacks

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealth(data)
    } catch (err) {
      setHealth({
        status: 'unhealthy',
        whisper_connected: false,
        error: 'Could not reach Whisper'
      })
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  // Force re-render when transcribedText changes
  useEffect(() => {
    console.log('[Realtime] Re-render triggered, text:', transcribedText.substring(0, 50))
  }, [transcribedText])

  // Track processing state for UI
  const [isProcessingUI, setIsProcessingUI] = useState(false)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsProcessingUI(isProcessingRef.current)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      setTranscribedText('')
      setError(null)

      // Send each chunk directly when available (no merging!)
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(200) // Get chunks quickly so they accumulate
      setIsRecording(true)
    } catch (err) {
      setError('Could not access microphone.')
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
      // Skip if already processing to avoid queue buildup
      if (isProcessing) {
        console.log('[Realtime] Skipping - already processing')
        return
      }

      if (chunksRef.current.length > 0) {
        setIsProcessing(true)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        // We DO NOT clear chunksRef.current = [] here!
        // We accumulate the audio and send it continuously.

        try {
          const formData = new FormData()
          formData.append('file', blob, 'recording.webm')

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          })

          if (response.ok) {
            const data = await response.json()
            if (data.text) {
              setTranscribedText(data.text)
              console.log('[Realtime] Text updated:', data.text.substring(0, 50))
            }
          } else {
            console.warn('[Realtime] Transcription failed:', response.status)
          }
        } catch (err) {
          console.warn('[Realtime] Transcription error:', err)
        } finally {
          setIsProcessing(false)
        }
      }
    }, 3000) // Send accumulated audio every 3 seconds

    return () => clearInterval(interval)
  }, [isRecording, isProcessing])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcribedText)
    alert('Text copied!')
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
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Realtime Transcription</h1>
          <div className="w-32" />
        </div>

        {/* Under Development Banner */}
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-yellow-400">Information</h3>
              <p className="text-sm text-gray-400">
                Whisper does not natively support real-time transcription. The goal is to achieve semi-real-time feedback where you receive updates on your speech during recording. This will happen in chunks as audio is collected.
              </p>
            </div>
          </div>
        </div>

        {/* Health Status */}
        <div className={`rounded-lg p-3 mb-6 border text-sm ${health?.whisper_connected
          ? 'bg-green-900/30 border-green-700'
          : 'bg-red-900/30 border-red-700'
          }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${health?.whisper_connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
            <span>Whisper: {health?.whisper_connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Recording Control */}
        <div className="flex justify-center mb-8">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-32 h-32 rounded-full flex items-center justify-center bg-green-600 hover:bg-green-500 transition-all shadow-lg"
            >
              <span className="text-lg font-semibold">Start</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="relative w-32 h-32 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 transition-all shadow-lg"
            >
              <span className="absolute inset-0 rounded-full animate-pulse border-4 border-red-500" />
              <span className="text-lg font-semibold">Stop</span>
            </button>
          )}
        </div>

        {/* Status */}
        {isRecording && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Recording... ({isProcessingUI ? 'Sending & processing...' : 'Collecting audio'})
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
                Copy
              </button>
              <button
                onClick={clearText}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
              >
                Clear
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
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Click "Start" to begin transcribing</li>
            <li>• Audio is streamed continuously to Whisper</li>
            <li>• The entire phrase updates smoothly to fix mistakes</li>
            <li>• Click "Stop" when you are done</li>
            <li>• Copy or clear the text</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
