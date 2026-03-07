import { useState, useRef, useEffect } from 'react'
import {
  Mic,
  Trash2,
  Copy,
  X,
  Plus,
  History,
  MessageSquare
} from 'lucide-react'

interface RealtimeTranscriberProps {
  onBack?: () => void
  onSendToChat?: (text: string) => void
}

interface HealthStatus {
  status: string
  whisper_connected: boolean
  whisper_latency_ms?: number
  ultravox_connected: boolean
  error?: string
}

export default function RealtimeTranscriber({ onSendToChat }: RealtimeTranscriberProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
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

  // Keep refs in sync with state
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
      setTranscribedText('')
      setError(null)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(200)
      setIsRecording(true)
      isRecordingRef.current = true
    } catch (err) {
      setError('Could not access microphone.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      isRecordingRef.current = false
    }
  }

  // Send chunks periodically - only depends on isRecording, uses refs for state
  useEffect(() => {
    if (!isRecordingRef.current) return

    const interval = setInterval(() => {
      if (isProcessingRef.current) return
      if (chunksRef.current.length > 0) {
        isProcessingRef.current = true
        setIsProcessing(true)

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', blob, 'recording.webm')
        fetch('/api/transcribe', { method: 'POST', body: formData })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.text) setTranscribedText(data.text)
          })
          .catch(err => console.warn('[Realtime] Error:', err))
          .finally(() => {
            isProcessingRef.current = false
            setIsProcessing(false)
          })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isRecording])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcribedText)
  }

  const handleSendToChat = () => {
    if (transcribedText && onSendToChat) {
      onSendToChat(transcribedText)
    }
  }

  const clearText = () => {
    setTranscribedText('')
  }

  return (
    <div className="flex-1 flex flex-col bg-black text-white h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 glass-header sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <History className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-black tracking-tight uppercase tracking-tighter">Realtime WS</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-gray-800 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${health?.whisper_connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              STT {health?.whisper_connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-gray-800 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${health?.ultravox_connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              LLM {health?.ultravox_connected ? 'Live' : 'Offline'}
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

          <div className="flex flex-col items-center justify-center py-10">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`
                 w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-500 relative
                 ${isRecording
                  ? 'bg-purple-600 shadow-[0_0_50px_rgba(147,51,234,0.3)] animate-pulse'
                  : 'bg-[#1d9bf0] shadow-[0_0_30px_rgba(29,155,240,0.1)] hover:scale-105'
                }
               `}
            >
              {isRecording ? (
                <>
                  <X className="w-10 h-10 mb-2" />
                  <span className="text-xs font-black uppercase tracking-widest">End WS</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10 mb-2" />
                  <span className="text-xs font-black uppercase tracking-widest">Connect</span>
                </>
              )}
              {isRecording && (
                <span className="absolute -inset-4 rounded-full border-2 border-purple-500/20 animate-ping" />
              )}
            </button>
            <p className="mt-8 text-gray-500 text-[11px] font-bold uppercase tracking-[0.2em]">
              Press <kbd className="px-2 py-1 bg-[#161616] border border-gray-800 rounded mx-1 text-white">Space</kbd> to toggle WS stream
            </p>
          </div>

          {transcribedText ? (
            <div className="space-y-6 animate-slide-up">
              <div className="bg-[#0b0b0b] border border-gray-800 rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Realtime Stream</span>
                  {isProcessing && (
                    <span className="flex items-center gap-2 text-purple-500 text-[10px] font-black uppercase">
                      <Plus className="w-3 h-3 animate-spin" /> Syncing with Node
                    </span>
                  )}
                </div>

                <p className="text-xl sm:text-2xl leading-relaxed font-medium text-white">
                  {transcribedText}
                  {isRecording && <span className="inline-block w-1 h-6 bg-purple-500 ml-1 animate-pulse align-middle" />}
                </p>

                <div className="mt-12 flex flex-wrap gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-6 py-3 bg-[#161616] hover:bg-gray-800 border border-gray-800 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:translate-y-[-2px]"
                  >
                    <Copy className="w-4 h-4" /> Copy
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
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-[#161616] border border-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-500">
                <History className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">WS Pipeline Ready</h3>
              <p className="text-gray-600 text-sm max-w-xs mx-auto mt-2">Continuous low-latency transcription stream directly to your private AI node.</p>
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
