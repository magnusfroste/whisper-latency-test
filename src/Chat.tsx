import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatConfig {
  apiUrl: string
  modelName: string
}

function Chat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<ChatConfig>({
    apiUrl: (import.meta as any).env?.VITE_CHAT_API_URL || 'http://192.168.68.107:8000/v1',
    modelName: (import.meta as any).env?.VITE_CHAT_MODEL_NAME || 'autoversio'
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
  }, [messages])

  // Microphone recording functions
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
        await sendVoiceMessage()
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setError(null)
    } catch (err) {
      setError('Kunde inte tillgå mikrofon. Se till att du ger tillstånd.')
      console.error('Microphone error:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendVoiceMessage = async () => {
    if (chunksRef.current.length === 0) return

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
      const transcribedText = data.text

      // Add transcribed message to chat
      const userMessage: Message = { role: 'user', content: transcribedText }
      setMessages(prev => [...prev, userMessage])

      // Send to chat model
      await sendMessage(transcribedText)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Okänt fel'
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
        content: data.choices?.[0]?.message?.content || 'Inget svar från modellen'
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Okänt fel'
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
    setMessages([])
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Tillbaka
            </button>
            <h1 className="text-xl font-bold">Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
            >
              {showConfig ? 'Dölj inställningar' : 'Inställningar'}
            </button>
            <button
              onClick={clearChat}
              className="text-sm bg-red-900/50 hover:bg-red-900 px-3 py-1 rounded transition-colors"
            >
              Rensa chatt
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
              Dessa inställningar sparas inte permanent. Använd miljövariabler i EasyPanel för permanenta värden.
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-xl mb-2">Välkommen till chatten!</p>
              <p>Skriv ett meddelande för att börja.</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
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
            {/* Voice Recording Button */}
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={() => isRecording && stopRecording()}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${isRecording
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-gray-700 hover:bg-gray-600'
                }
              `}
              title="Håll inne för att prata"
            >
              {isRecording ? (
                <div className="w-3 h-3 bg-white rounded" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
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
              placeholder="Skriv ditt meddelande..."
              disabled={isLoading}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Skicka
            </button>
          </form>
          {isRecording && (
            <p className="text-center text-red-400 text-sm mt-2 animate-pulse">
              Lyssnar... (släpp för att skicka)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat
