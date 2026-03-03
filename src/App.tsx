import { useState, useRef } from 'react'

interface Transcription {
  text: string
  latency: number
  timestamp: Date
}

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [currentResult, setCurrentResult] = useState<string | null>(null)
  const [currentLatency, setCurrentLatency] = useState<number | null>(null)
  const [history, setHistory] = useState<Transcription[]>([])
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Whisper Latens-test
        </h1>

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
