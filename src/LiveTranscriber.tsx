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
  const [renderKey, setRenderKey] = useState(0) // Force re-render

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const lastSendTimeRef = useRef<number>(0)
  const liveTextRef = useRef('')
  const liveTextElementRef = useRef<HTMLParagraphElement>(null)

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
      liveTextRef.current = ''
      setFinalText('')
      setError(null)
      lastSendTimeRef.current = 0

      // Collect chunks as they come in
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('[Live] Chunk mottagen:', event.data.size, 'bytes')

          // Send immediately if enough time has passed
          const now = Date.now()
          if (now - lastSendTimeRef.current > 2000) {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
            console.log('[Live] Skickar chunk direkt:', blob.size, 'bytes')
            sendChunk(blob)
            chunksRef.current = []
            lastSendTimeRef.current = now
          }
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        // Send any remaining chunks
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          console.log('[Live] Skickar sista chunk:', blob.size, 'bytes')
          sendChunk(blob)
          chunksRef.current = []
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)

      console.log('[Live] Inspeking startad')
    } catch (err) {
      setError('Kunde inte tillgripa mikrofonen.')
      console.error('Microphone error:', err)
    }
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log('[Live] Inspeking stoppad')
    }
  }

  const sendChunk = async (blobData: Blob) => {
    console.log('[Live] sendChunk startad, blob size:', blobData.size)
    // Skip if already processing to avoid queue buildup
    if (isProcessing) {
      console.log('[Live] Hoppar över chunk - bearbetar redan')
      return
    }

    setIsProcessing(true)
    const formData = new FormData()
    formData.append('file', blobData, 'recording.webm')
    console.log('[Live] FormData skapat')

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        console.warn('[Live] Transkribering misslyckades:', response.status)
        // Don't show error, just skip this chunk
        setIsProcessing(false)
        return
      }

      const data = await response.json()
      console.log('[Live] Transkribering:', data.text)

      // Update live text ref and DOM directly
      const newText = liveTextRef.current && !data.text.startsWith(liveTextRef.current)
        ? liveTextRef.current + ' ' + data.text
        : data.text
      liveTextRef.current = newText

      // Update text ref and force re-render
      liveTextRef.current = newText
      setRenderKey(k => k + 1) // Force re-render

      // Direct DOM update with requestAnimationFrame
      if (liveTextElementRef.current) {
        requestAnimationFrame(() => {
          liveTextElementRef.current!.textContent = newText
          console.log('[Live] DOM uppdaterad:', newText.substring(0, 50))
        })
      }
    } catch (err) {
      console.warn('[Live] Transkriberingsfel:', err)
      // Don't show error, just skip this chunk
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = () => {
    const textToCopy = finalText || liveTextRef.current
    navigator.clipboard.writeText(textToCopy)
    alert('Text kopierad till urklipp!')
  }

  const clearText = () => {
    liveTextRef.current = ''
    if (liveTextElementRef.current) {
      liveTextElementRef.current.textContent = ''
    }
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
            ← Tillbaka till Push-to-Talk
          </button>
          <h1 className="text-2xl font-bold">Live Transkribering</h1>
          <div className="w-32" /> {/* Spacer for centering */}
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
            <span>
              Whisper: {health?.whisper_connected ? 'Ansluten' : 'Kopplad'}
            </span>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex justify-center mb-8">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="
                w-32 h-32 rounded-full flex items-center justify-center
                bg-green-600 hover:bg-green-500
                transition-all duration-200 shadow-lg
              "
            >
              <span className="text-lg font-semibold">Spela in</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="
                relative w-32 h-32 rounded-full flex items-center justify-center
                bg-red-600 hover:bg-red-500
                transition-all duration-200 shadow-lg
              "
            >
              <span className="absolute inset-0 rounded-full animate-pulse border-4 border-red-500" />
              <span className="text-lg font-semibold">Stoppa</span>
            </button>
          )}
        </div>

        {/* Status indicator */}
        {isRecording && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Inspekar... ({isProcessing ? 'Bearbetar...' : 'Lyssnar'})
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
        {(liveTextRef.current || finalText) && (
          <div className="mb-6">
            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
              >
                Kopiera text
              </button>
              <button
                onClick={clearText}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                Rensa
              </button>
            </div>

            {/* Final text (when recording stops) */}
            {finalText && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-4">
                <h3 className="text-sm text-gray-400 mb-2">Slutgiltig transkribering:</h3>
                <p className="text-lg leading-relaxed">{finalText}</p>
              </div>
            )}

            {/* Live text (while recording) */}
            <div key={renderKey} className="bg-blue-900/20 rounded-lg p-6 border border-blue-700">
              <h3 className="text-sm text-blue-400 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Live (uppdateras medan du pratar):
              </h3>
              <p ref={liveTextElementRef} className="text-lg leading-relaxed">{liveTextRef.current}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="font-semibold mb-2">Instruktioner:</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Klicka "Spela in" för att börja transkribera</li>
            <li>• Texten uppdateras automatiskt var 5:e sekund</li>
            <li>• Klicka "Stoppa" när du är klar</li>
            <li>• Kopiera texten eller rensa för nytt</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
