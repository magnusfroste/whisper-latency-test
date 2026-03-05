import { useState, useRef, useEffect } from 'react'

interface LiveTranscriberProps {
  onBack: () => void
}

interface HealthStatus {
  status: string
  whisper_connected: boolean
  whisper_latency_ms?: number
  error?: string
}

export default function LiveTranscriber({ onBack }: LiveTranscriberProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [finalText, setFinalText] = useState('')
  const [liveText, setLiveText] = useState('') // State for real-time updates

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      chunksRef.current = []
      setLiveText('')
      setFinalText('')
      setError(null)

      // Collect chunks as they come in
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('[Live] Chunk received:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        // Send final state
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          console.log('[Live] Sending final chunk:', blob.size, 'bytes')
          sendChunk(blob).then((text) => setFinalText(text || liveText))
        }
        setIsRecording(false)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)

      // Send accumulated chunks every 3 seconds for better real-time feel
      intervalRef.current = setInterval(async () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          console.log('[Live] Sending accumulated chunks:', blob.size, 'bytes')
          await sendChunk(blob)
          // We DO NOT clear chunksRef.current = [] here!
          // We must send the whole accumulated recording each time so that it includes the valid WebM header
          // and so Whisper can use the full context to fix mistakes continuously.
        }
      }, 3000)

      console.log('[Live] Recording started')
    } catch (err) {
      setError('Could not access microphone.')
      console.error('Microphone error:', err)
    }
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log('[Live] Recording stopped')
    }
  }

  // Handle Spacebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        if (isRecording) {
          stopRecording()
        } else {
          startRecording()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording])

  const sendChunk = async (blobData: Blob) => {
    console.log('[Live] sendChunk started, blob size:', blobData.size)
    // Skip if already processing to avoid queue buildup
    if (isProcessing) {
      console.log('[Live] Skipping chunk - already processing')
      return
    }

    setIsProcessing(true)
    const formData = new FormData()
    formData.append('file', blobData, 'recording.webm')
    console.log('[Live] FormData created')

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        console.warn('[Live] Transcription failed:', response.status)
        // Don't show error, just skip this chunk
        setIsProcessing(false)
        return
      }

      const data = await response.json()
      console.log('[Live] Transcription:', data.text)

      // Because we send the full audio from the start every time,
      // Whisper will transcribe the entire thing again. We can just replace the text.
      if (data.text) {
        setLiveText(data.text)
        console.log('[Live] setLiveText:', data.text.substring(0, 50))
        return data.text
      }
    } catch (err) {
      console.warn('[Live] Transcription error:', err)
      // Don't show error, just skip this chunk
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = () => {
    const textToCopy = finalText || liveText
    navigator.clipboard.writeText(textToCopy)
    alert('Text copied to clipboard!')
  }

  const clearText = () => {
    setLiveText('')
    setFinalText('')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Push-to-Talk
          </button>
          <h1 className="text-2xl font-bold">Live Transcription</h1>
          <div className="w-32" /> {/* Spacer for centering */}
        </div>

        {/* Health Status */}
        <div className={`rounded-lg p-3 mb-6 border text-sm ${health?.whisper_connected
          ? 'bg-green-900/30 border-green-700'
          : 'bg-red-900/30 border-red-700'
          }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${health?.whisper_connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
            <span>
              Whisper: {health?.whisper_connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex justify-center mb-8">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`
                relative w-32 h-32 rounded-full flex items-center justify-center
                transition-all duration-200 shadow-lg
                ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}
              `}
          >
            {isRecording && <span className="absolute inset-0 rounded-full animate-pulse border-4 border-red-500" />}
            <span className="text-lg font-semibold">{isRecording ? 'Stop' : 'Record'}</span>
          </button>
        </div>
        <p className="text-center text-gray-500 text-sm mb-8">
          Press <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs font-mono">Space</kbd> to toggle recording
        </p>

        {/* Status indicator */}
        {isRecording && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Recording... ({isProcessing ? 'Sending & processing...' : 'Collecting audio'})
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-center">
            {error}
          </div>
        )}

        {/* Live transcription display */}
        {(liveText || finalText) && (
          <div className="mb-6">
            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
              >
                Copy text
              </button>
              <button
                onClick={clearText}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Final text (when recording stops) */}
            {finalText && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-4">
                <h3 className="text-sm text-gray-400 mb-2">Final transcription:</h3>
                <p className="text-lg leading-relaxed">{finalText}</p>
              </div>
            )}

            {/* Live text (while recording) */}
            <div className="bg-blue-900/20 rounded-lg p-6 border border-blue-700">
              <h3 className="text-sm text-blue-400 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Live (updates while you speak):
              </h3>
              <textarea
                readOnly
                className="w-full bg-transparent text-lg leading-relaxed text-white resize-none outline-none"
                rows={3}
                value={liveText}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Click "Record" to start transcribing</li>
            <li>• Text updates automatically every 5 seconds while you speak</li>
            <li>• Click "Stop" when you're done</li>
            <li>• Copy the text or clear for new</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
