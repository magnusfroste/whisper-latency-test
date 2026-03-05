import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Mic, Square, Send, Settings, Trash2, ArrowLeft } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatConfig {
  apiUrl: string
  modelName: string
}

const LOCAL_STORAGE_KEY = 'privai_chat_messages'
const LOCAL_STORAGE_CONFIG_KEY = 'privai_chat_config'

function Chat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved messages', e)
      }
    }
    return [
      {
        role: 'assistant',
        content: 'Welcome to this completely private chat! Both text and audio transcription data storage happens on a local server. The AI model is an open-source model whose agentic profile can be customized!'
      }
    ]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<ChatConfig>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved config', e)
      }
    }
    return {
      apiUrl: (import.meta as any).env?.VITE_CHAT_API_URL || 'http://192.168.68.107:8000/v1',
      modelName: (import.meta as any).env?.VITE_CHAT_MODEL_NAME || 'autoversio'
    }
  })
  const [showConfig, setShowConfig] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config))
  }, [config])

  // Microphone recording functions - toggle start/stop
  const toggleRecording = async () => {
    try {
      if (isRecording) {
        // Stop recording
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop()
        }
        setIsRecording(false)
      } else {
        // Start recording
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
          await sendVoiceMessage()
          setIsRecording(false)
        }

        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start()
        setIsRecording(true)
        setError(null)
      }
    } catch (err) {
      setError('Could not access microphone. Ensure you have given permission.')
      console.error('Microphone error:', err)
    }
  }

  // Handle Spacebar hold-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        if (!isRecording && !isLoading) {
          toggleRecording() // Start
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (isRecording) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isRecording, isLoading])

  const sendVoiceMessage = async () => {
    if (chunksRef.current.length === 0) return

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    if (blob.size < 500) {
      console.log('Recording too short, ignoring. Size:', blob.size)
      return
    }
    const formData = new FormData()
    formData.append('file', blob, 'recording.webm')

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      const transcribedText = data.text

      // Add transcribed message to chat
      const userMessage: Message = { role: 'user', content: transcribedText }
      setMessages(prev => [...prev, userMessage])

      // Send to chat model
      await sendMessage(transcribedText)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
    }
  }

  const sendMessage = async (text: string) => {
    const userMessage: Message = { role: 'user', content: text }
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiUrl: config.apiUrl,
          modelName: config.modelName,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Chat API error')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || 'No response from model'
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      setMessages(prev => prev.filter(m => m !== userMessage))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    await sendMessage(input)
  }

  const clearChat = () => {
    const defaultMessages: Message[] = [
      {
        role: 'assistant',
        content: 'Welcome to this completely private chat! Both text and audio transcription data storage happens on a local server. The AI model is an open-source model whose agentic profile can be customized!'
      }
    ]
    setMessages(defaultMessages)
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 shadow-sm z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-xl font-bold">Privat Chat</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded transition-colors ${showConfig ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="max-w-4xl mx-auto mt-4 p-4 bg-gray-700/50 rounded-lg">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">API URL</label>
                <input
                  type="text"
                  value={config.apiUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="http://192.168.68.107:8000/v1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Model Name</label>
                <input
                  type="text"
                  value={config.modelName}
                  onChange={(e) => setConfig(prev => ({ ...prev, modelName: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="qwen35-35-fp8"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              These settings are not saved permanently. Use environment variables in EasyPanel for permanent values.
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-xl mb-2">Welcome to the chat!</p>
              <p>Type a message to start.</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm'
                  }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            {/* Voice Recording Button - Toggle Start/Stop */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`
                flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${isRecording
                  ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }
              `}
              title={isRecording ? 'Click to stop' : 'Click to speak'}
            >
              {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          {isRecording && (
            <p className="text-center text-red-400 text-sm mt-2 animate-pulse">
              Listening... (click or release space to stop)
            </p>
          )}
          {!isRecording && (
            <p className="text-center text-gray-500 text-xs mt-2">
              Hold <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] font-mono">Space</kbd> to talk
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat
