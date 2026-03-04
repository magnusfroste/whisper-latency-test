import { useState, useRef, useEffect } from 'react'
import LiveTranscriber from './LiveTranscriber'
import RealtimeTranscriber from './RealtimeTranscriber'

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
  const [view, setView] = useState<'landing' | 'push' | 'live' | 'realtime'>('landing')
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

  // Show realtime transcriber view
  if (view === 'realtime') {
    return <RealtimeTranscriber onBack={() => setView('push')} />
  }

  // Landing Page
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

          <div className="max-w-6xl mx-auto px-4 py-20 md:py-32 relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-700 rounded-full px-4 py-2 mb-6">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-300">100% Privat & Säker</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Privat Ljudtranskribering
              </h1>

              <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto">
                Transkribera tal till text lokalt utan att skicka dina ljud till molnet.
                Full kontroll över dina data – ingen sparning, ingen delning.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <button
                  onClick={() => setView('push')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-lg transition-all shadow-lg shadow-blue-600/25"
                >
                  Kom igång nu
                </button>
                <a
                  href="https://www.privai.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-semibold text-lg transition-all"
                >
                  Läs mer om PRIVAI →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">100% Privat</h3>
              <p className="text-gray-400">
                Alla ljudbearbetningar sker lokalt. Dina samtal delas aldrig med någon tredje part.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Snabbt</h3>
              <p className="text-gray-400">
                Minimal latens tack vare optimerad Whisper-modell och lokal bearbetning.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Hög Noggrannhet</h3>
              <p className="text-gray-400">
                OpenAI:s Whisper-large-v3 ger exceptionellt bra transkribering på svenska.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Så Fungerar Det</h2>

          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-semibold mb-2">Håll inne mikrofonknappen</h3>
                <p className="text-gray-400">
                  Tryck och håll inne den stora knappen medan du pratar. Släpp för att transkribera.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-semibold mb-2">Se resultatet direkt</h3>
                <p className="text-gray-400">
                  Texten visas omedelbart med information om bearbetningstid.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-semibold mb-2">Kopiera eller spara</h3>
                <p className="text-gray-400">
                  Kopiera transkriberingen till urklipp eller titta på historik.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold mb-6">Redo att börja?</h2>
          <p className="text-xl text-gray-400 mb-8">
            Testa vår privata ljudtranskribering idag – helt gratis och utan registrering.
          </p>
          <button
            onClick={() => setView('push')}
            className="px-10 py-5 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-xl transition-all shadow-lg shadow-blue-600/25"
          >
            Börja Transkribera
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">
                Driven av <a href="https://www.autoversio.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Autoversio</a>
              </p>
              <div className="flex gap-6">
                <a
                  href="https://www.autoversio.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Autoversio
                </a>
                <a
                  href="https://www.privai.se"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  PRIVAI
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Välkommen till Privat Transkribering
        </h1>

        {/* View Switcher */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setView('push')}
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-blue-600 text-white"
          >
            Push-to-Talk
          </button>
          <button
            onClick={() => setView('live')}
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Live Transkribering
          </button>
          <button
            onClick={() => setView('realtime')}
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Realtime
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
