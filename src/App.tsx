import { useState, useRef, useEffect } from 'react'
import LiveTranscriber from './LiveTranscriber'

interface Transcription {
  text: string
  latency: number
  timestamp: Date
}

interface HealthStatus {
  status: string
  whisper_connected: boolean
  whisper_latency_ms?: number
  error?: string
}

function App() {
  const [view, setView] = useState<'push' | 'live'>('push')
  const [isRecording, setIsRecording] = useState(false)
  const [currentResult, setCurrentResult] = useState<string | null>(null)
  const [currentLatency, setCurrentLatency] = useState<number | null>(null)
  const [history, setHistory] = useState<Transcription[]>([])
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [checkingHealth, setCheckingHealth] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const checkHealth = async () => {
    setCheckingHealth(true)
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealth(data)
      console.log('Health check:', data)
    } catch (err) {
      console.error('Health check failed:', err)
      setHealth({
        status: 'unhealthy',
        whisper_connected: false,
        error: 'Kunde inte nå health endpoint'
      })
    } finally {
      setCheckingHealth(false)
    }
  }

  // Check health on mount
  useEffect(() => {
    checkHealth()
  }, [])

  const getLatencyColor = (latency: number): string => {
    if (latency < 500) return 'text-green-400'
    if (latency < 1000) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getLatencyBgColor = (latency: number): string => {
    if (latency < 500) return 'bg-green-900/30 border-green-700'
    if (latency < 1000) return 'bg-yellow-900/30 border-yellow-700'
    return 'bg-red-900/30 border-red-700'
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        await sendRecording()
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setError(null)
    } catch (err) {
      setError('Kunde inte tillgripa mikrofon. Se till att du ger tillstånd.')
      console.error('Microphone error:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendRecording = async () => {
    if (chunksRef.current.length === 0) return

    const startTime = performance.now()
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('file', blob, 'recording.webm')

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Transkribering misslyckades')
      }

      const data = await response.json()
      const endTime = performance.now()
      const latency = Math.round(endTime - startTime)

      setCurrentResult(data.text)
      setCurrentLatency(latency)

      setHistory(prev => [
        {
          text: data.text,
          latency,
          timestamp: new Date()
        },
        ...prev.slice(0, 9)
      ])
    } catch (err) {
      setError('Kunde inte transkribera. Kontrollera Whisper-servern.')
      console.error('Transcription error:', err)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Show live transcriber view
  if (view === 'live') {
    return <LiveTranscriber onBack={() => setView('push')} />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Whisper Latens-test
        </h1>

        {/* View Switcher */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setView('push')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              view === 'push'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Push-to-Talk
          </button>
          <button
            onClick={() => setView('live')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              view === 'live'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Live Transkribering
          </button>
        </div>

        {/* Health Status */}
        <div className={`rounded-lg p-4 mb-6 border ${
          health?.whisper_connected
            ? 'bg-green-900/30 border-green-700'
            : 'bg-red-900/30 border-red-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                health?.whisper_connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="font-semibold">
                Whisper: {health?.whisper_connected ? 'Ansluten' : 'Kopplad'}
              </span>
            </div>
            <button
              onClick={checkHealth}
              disabled={checkingHealth}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded disabled:opacity-50"
            >
              {checkingHealth ? 'Kontrollerar...' : 'Uppdatera'}
            </button>
          </div>
          {health?.whisper_latency_ms && (
            <p className="text-sm text-gray-400 mt-2">
              Latens till Whisper: {health.whisper_latency_ms}ms
            </p>
          )}
          {health?.error && (
            <p className="text-sm text-red-400 mt-2">{health.error}</p>
          )}
        </div>

        <div className="flex justify-center mb-8">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => isRecording && stopRecording()}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`
              relative w-32 h-32 rounded-full flex items-center justify-center
              transition-all duration-200
              ${isRecording
                ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)]'
                : 'bg-gray-700 hover:bg-gray-600'
              }
            `}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full animate-pulse-ring border-4 border-red-500" />
            )}
            <span className="text-lg font-semibold">
              {isRecording ? 'Släpp' : 'Håll inne'}
            </span>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-center">
            {error}
          </div>
        )}

        {currentResult && (
          <div className={`rounded-lg p-6 mb-6 border ${getLatencyBgColor(currentLatency || 0)}`}>
            <p className="text-xl mb-4">{currentResult}</p>
            <p className={`text-sm font-mono ${getLatencyColor(currentLatency || 0)}`}>
              Latens: {currentLatency}ms
            </p>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold mb-4">Historik</h2>
            {history.map((item, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 border ${getLatencyBgColor(item.latency)}`}
              >
                <p className="text-sm mb-2">{item.text}</p>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{formatTime(item.timestamp)}</span>
                  <span className={getLatencyColor(item.latency)}>
                    {item.latency}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
