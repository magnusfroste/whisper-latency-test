import { useState, useRef, useEffect } from 'react'
import {
  Mic,
  Trash2,
  Copy,
  X,
  Plus,
  Waves,
  MessageSquare
} from 'lucide-react'

interface LiveTranscriberProps {
  onBack?: () => void
  onSendToChat?: (text: string) => void
}

interface HealthStatus {
  status: string
  whisper_connected: boolean
  whisper_latency_ms?: number
  error?: string
}

export default function LiveTranscriber({ onSendToChat }: LiveTranscriberProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [finalText, setFinalText] = useState('')
  const [liveText, setLiveText] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false)
  const isRecordingRef = useRef(false)

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

  // Keep ref in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  // Handle Spacebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        if (isRecordingRef.current) stopRecording()
        else startRecording()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          sendChunk(blob).then((text) => setFinalText(text || liveText))
        }
        setIsRecording(false)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      isRecordingRef.current = true

      intervalRef.current = setInterval(() => {
        if (isProcessingRef.current) return
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          sendChunk(blob)
        }
      }, 3000)

    } catch (err) {
      setError('Could not access microphone.')
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
    }
  }

  const sendChunk = async (blobData: Blob) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    setIsProcessing(true)

    const formData = new FormData()
    formData.append('file', blobData, 'recording.webm')

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })
      if (!response.ok) {
        return
      }
      const data = await response.json()
      if (data.text) {
        setLiveText(data.text)
        return data.text
      }
    } catch (err) {
      console.warn('[Transcribe] Error:', err)
    } finally {
      isProcessingRef.current = false
      setIsProcessing(false)
    }
  }

  const copyToClipboard = () => {
    const textToCopy = finalText || liveText
    navigator.clipboard.writeText(textToCopy)
  }

  const handleSendToChat = () => {
    const textToSend = finalText || liveText
    if (textToSend && onSendToChat) {
      onSendToChat(textToSend)
    }
  }

  const clearText = () => {
    setLiveText('')
    setFinalText('')
  }

  return (
    <div className="flex-1 flex flex-col bg-black text-white h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 glass-header sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Waves className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-black tracking-tight uppercase tracking-tighter">Transcribe</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-gray-800 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${health?.whisper_connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Whisper {health?.whisper_connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button onClick={clearText} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-20 py-10">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* Audio Visualizer Placeholder / Pulsing Circle */}
          <div className="flex flex-col items-center justify-center py-10">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`
                 w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-500 relative
                 ${isRecording
                  ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse'
                  : 'bg-[#1d9bf0] shadow-[0_0_30px_rgba(29,155,240,0.1)] hover:scale-105'
                }
               `}
            >
              {isRecording ? (
                <>
                  <X className="w-10 h-10 mb-2" />
                  <span className="text-xs font-black uppercase tracking-widest">Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10 mb-2" />
                  <span className="text-xs font-black uppercase tracking-widest">Start</span>
                </>
              )}
              {isRecording && (
                <span className="absolute -inset-4 rounded-full border-2 border-red-500/20 animate-ping" />
              )}
            </button>
            <p className="mt-8 text-gray-500 text-[11px] font-bold uppercase tracking-[0.2em]">
              Press <kbd className="px-2 py-1 bg-[#161616] border border-gray-800 rounded mx-1 text-white">Space</kbd> to toggle capture
            </p>
          </div>

          {/* Results Area */}
          {(liveText || finalText) && (
            <div className="space-y-6 animate-slide-up">
              <div className="bg-[#0b0b0b] border border-gray-800 rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden group">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Generated Transcript</span>
                  {isProcessing && (
                    <span className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase">
                      <Plus className="w-3 h-3 animate-spin" /> Processing
                    </span>
                  )}
                </div>

                <p className={`text-xl sm:text-2xl leading-relaxed font-medium transition-all ${isRecording ? 'text-gray-100' : 'text-white'}`}>
                  {finalText || liveText}
                  {isRecording && <span className="inline-block w-1 h-6 bg-blue-500 ml-1 animate-pulse align-middle" />}
                </p>

                <div className="mt-12 flex flex-wrap gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-6 py-3 bg-[#161616] hover:bg-gray-800 border border-gray-800 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:translate-y-[-2px]"
                  >
                    <Copy className="w-4 h-4" /> Copy Text
                  </button>
                  <button
                    onClick={handleSendToChat}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:translate-y-[-2px] shadow-xl"
                  >
                    <MessageSquare className="w-4 h-4" /> Send to Chat
                  </button>
                </div>
              </div>
            </div>
          )}

          {!(liveText || finalText) && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-[#161616] border border-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-500">
                <Waves className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">Ready to transcribe</h3>
              <p className="text-gray-600 text-sm max-w-xs mx-auto mt-2">Start talking to see your speech converted to text in high-fidelity.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-[2rem] text-center animate-slide-up">
              {error}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
