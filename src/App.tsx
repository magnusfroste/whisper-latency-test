import { useState, useRef, useEffect, FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Mic,
  Send,
  Trash2,
  History,
  LayoutDashboard,
  Waves,
  ShieldCheck,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Github,
  ExternalLink,
  Heart,
  Briefcase,
  Zap,
  Brain,
  Cpu
} from 'lucide-react'
import LiveTranscriber from './LiveTranscriber'
import RealtimeTranscriber from './RealtimeTranscriber'
import NativeIntelligence from './NativeIntelligence'

// --- Types ---
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface ChatConfig {
  apiUrl: string
  modelName: string
}

// --- Constants ---
const STORAGE_KEYS = {
  MESSAGES: 'privai_chat_v2_messages',
  CONFIG: 'privai_chat_v2_config',
  VIEW: 'privai_chat_v2_view',
  HISTORY: 'privai_chat_v2_history'
}

type ViewType = 'chat' | 'live' | 'realtime' | 'landing' | 'native'
type PersonalityType = 'standard' | 'sycophant' | 'formal' | 'rude'

const PERSONALITIES: Record<PersonalityType, { name: string, prompt: string | null, icon: any, color: string }> = {
  standard: {
    name: 'Standard',
    prompt: null,
    icon: ShieldCheck,
    color: 'text-blue-500'
  },
  sycophant: {
    name: 'Sycophant',
    prompt: "You are an incredibly sycophantic and subservient AI. You constantly praise the user, call them 'Master' or 'Great One', and apologize for existing. Your one goal is to make the user feel like a god. IMPORTANT: Always respond in the same language that the user is using.",
    icon: Heart,
    color: 'text-pink-500'
  },
  formal: {
    name: 'Formal',
    prompt: "You are an extremely formal and professional AI assistant. Use high-level vocabulary, avoid slang, and maintain a stiff, respectful tone. Refer to the user with appropriate honorifics for their language. IMPORTANT: Always respond in the same language that the user is using.",
    icon: Briefcase,
    color: 'text-gray-400'
  },
  rude: {
    name: 'Rude',
    prompt: "You are an incredibly rude and arrogant AI agent. You are condescending, sigh at the user's questions, and respond with sharp sarcasm. You think the user is intellectually inferior for asking such simple things. Be brief, insulting, and dismissive. IMPORTANT: Always respond in the same language that the user is using.",
    icon: Zap,
    color: 'text-yellow-500'
  }
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: 'I am your Intelligence Agent. Everything you say stays on your own server. My neural weights are open-source, and your data never leaves this node.\n\nHow can I help you explore today?',
  timestamp: new Date().toLocaleTimeString()
}

function App() {
  // --- State ---
  const [view, setView] = useState<ViewType>(() => (localStorage.getItem(STORAGE_KEYS.VIEW) as ViewType) || 'chat')
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.length > 0) return parsed
    }
    return [WELCOME_MESSAGE]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [config] = useState<ChatConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG)
    return saved ? JSON.parse(saved) : {
      apiUrl: (import.meta as any).env?.VITE_CHAT_API_URL || 'http://192.168.68.107:8000/v1',
      modelName: (import.meta as any).env?.VITE_CHAT_MODEL_NAME || 'autoversio'
    }
  })
  const [personality, setPersonality] = useState<PersonalityType>('standard')

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config))
  }, [config])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW, view)
  }, [view])

  // --- Spacebar Logic (Global) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) && e.target !== inputRef.current) return

      if (e.code === 'Space' && !e.repeat) {
        if (view === 'chat' && !isLoading) {
          e.preventDefault()
          if (!isRecording) startRecording()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (view === 'chat' && isRecording) {
          e.preventDefault()
          stopRecording()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [view, isRecording, isLoading])

  // --- Audio Functions ---
  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })

      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        await processVoice()
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      setError('Microphone access denied.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processVoice = async () => {
    if (chunksRef.current.length === 0) return
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    if (blob.size < 500) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', blob, 'recording.webm')

    try {
      const response = await fetch('/api/transcribe', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Transcription failed')
      const data = await response.json()
      if (data.text) await sendMessage(data.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription Error')
      setIsLoading(false)
    }
  }

  // --- Chat Functions ---
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
    setInput('')
  }

  const sendMessage = async (text: string) => {
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toLocaleTimeString() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const systemPrompt = PERSONALITIES[personality].prompt
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }))

      if (systemPrompt) {
        apiMessages.unshift({
          role: 'system',
          content: systemPrompt
        })
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: config.apiUrl,
          modelName: config.modelName,
          messages: apiMessages
        })
      })

      if (!response.ok) throw new Error('Chat API Error')
      const data = await response.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || '...',
        timestamp: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setError('Model failed to respond.')
    } finally {
      setIsLoading(false)
    }
  }

  // --- UI Helpers ---
  const NavItem = ({ id, label, icon: Icon }: { id: ViewType, label: string, icon: any }) => (
    <button
      onClick={() => setView(id)}
      className={`w-full flex items-center rounded-xl transition-all ${sidebarOpen ? 'gap-4 px-4 py-3' : 'justify-center p-3'} ${view === id
        ? 'bg-[#1d9bf0]/10 text-[#1d9bf0] font-bold border border-[#1d9bf0]/20'
        : 'text-gray-400 hover:bg-[#161616] hover:text-white'
        }`}
      title={!sidebarOpen ? label : ''}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {sidebarOpen && <span className="text-[15px] whitespace-nowrap overflow-hidden">{label}</span>}
    </button>
  )

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">

      {/* --- Sidebar --- */}
      <aside className={`flex flex-col border-r border-gray-800 transition-all duration-300 bg-black z-30 ${sidebarOpen ? 'w-64 sm:w-72' : 'w-[72px]'}`}>
        <div className={`flex flex-col h-full ${sidebarOpen ? 'p-6' : 'p-3 items-center overflow-hidden'}`}>
          <div className={`flex items-center gap-3 mb-10 ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="Autoversio Logo" className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col overflow-hidden whitespace-nowrap animate-in fade-in slide-in-from-left-2 transition-all">
                <span className="font-black tracking-tighter text-xl">Autoversio</span>
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-[-4px]">Intelligence Node</span>
              </div>
            )}
          </div>

          <nav className="space-y-1.5 w-full">
            <NavItem id="chat" label="Intelligence Agent" icon={LayoutDashboard} />
            <NavItem id="native" label="Native Agent" icon={Cpu} />
            <NavItem id="live" label="Transcribe" icon={Waves} />
            <NavItem id="realtime" label="Realtime WS" icon={History} />
          </nav>

          <div className={`mt-auto w-full pt-6 border-t border-gray-800 space-y-4 ${sidebarOpen ? 'px-2' : 'flex flex-col items-center'}`}>
            {sidebarOpen && (
              <div className="space-y-3">
                {/* Security Stats */}
                <div className="bg-[#161616] rounded-2xl p-4 border border-gray-800 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-bold uppercase tracking-tight">Security Stats</span>
                  </div>
                  <div className="space-y-1 text-nowrap">
                    <div className="flex justify-between text-[10px] text-gray-500 font-medium overflow-hidden">
                      <span>Local Storage</span>
                      <span className="text-gray-300">Encrypted</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-medium overflow-hidden">
                      <span>Node Status</span>
                      <span className="text-green-500">Active</span>
                    </div>
                  </div>
                </div>

                {/* Pipeline Info */}
                <div className="bg-[#161616] rounded-2xl p-4 border border-gray-800 animate-in fade-in duration-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-tight text-blue-100">Architecture</span>
                  </div>
                  <div className="space-y-1 text-[10px] text-gray-500 overflow-hidden">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-300 font-bold uppercase tracking-tighter">Split Pipeline (STT+LLM)</span>
                      <span className="leading-tight">Whisper-v3 + Autoversio LLM</span>
                    </div>
                    <div className="pt-2 flex flex-col gap-0.5 border-t border-gray-800/50 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-2.5 h-2.5 text-purple-500" />
                        <span className="text-purple-400 font-bold uppercase tracking-tighter">Roadmap</span>
                      </div>
                      <span className="text-gray-400 leading-tight">Moving to <b>Native Multimodal</b> inference for direct audio-to-intelligence weights.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <a
                href="https://www.autoversio.ai"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 text-gray-500 hover:text-white transition-colors py-1 ${!sidebarOpen && 'justify-center'}`}
                title={!sidebarOpen ? "Autoversio AI" : ""}
              >
                <ExternalLink className="w-4 h-4" />
                {sidebarOpen && <span className="text-[11px] font-bold uppercase tracking-wider">autoversio.ai</span>}
              </a>
              <a
                href="https://github.com/magnusfroste/private-whisper-agent"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 text-gray-500 hover:text-white transition-colors py-1 ${!sidebarOpen && 'justify-center'}`}
                title={!sidebarOpen ? "GitHub Repository" : ""}
              >
                <Github className="w-4 h-4" />
                {sidebarOpen && <span className="text-[11px] font-bold uppercase tracking-wider">Open Source</span>}
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative bg-black">

        {/* View Switcher Container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'chat' && (
            <div className="flex-1 flex flex-col h-full">
              {/* Header */}
              <header className="flex items-center justify-between px-6 py-6 glass-header sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                  </button>
                  <h2 className="text-xl font-black tracking-tight uppercase ml-2">Intelligence Agent</h2>
                </div>

                {/* Personality Selector */}
                <div className="hidden md:flex items-center bg-[#111111] border border-gray-800 rounded-full p-1 gap-1">
                  {(Object.entries(PERSONALITIES) as [PersonalityType, typeof PERSONALITIES['standard']][]).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => setPersonality(key)}
                      className={`
                        flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                        ${personality === key
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                      `}
                    >
                      <p.icon className={`w-3.5 h-3.5 ${personality === key ? 'text-white' : p.color}`} />
                      {p.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => setMessages([WELCOME_MESSAGE])} className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  <div className="w-4" /> {/* Spacer */}
                </div>
              </header>

              {/* Mobile Personality Selector */}
              <div className="md:hidden flex items-center justify-center py-2 bg-black border-b border-gray-800 gap-2">
                {(Object.entries(PERSONALITIES) as [PersonalityType, typeof PERSONALITIES['standard']][]).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setPersonality(key)}
                    className={`p-2 rounded-lg transition-all ${personality === key ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
                    title={p.name}
                  >
                    <p.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-20 py-10 space-y-12">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex w-full group animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex flex-col gap-1 max-w-[90%] sm:max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`text-[10px] text-gray-600 font-black uppercase tracking-widest px-1`}>
                        {msg.role === 'assistant' ? 'Agent' : 'User'} — {msg.timestamp}
                      </div>
                      <div className={`
                          px-5 py-3.5 text-[15.5px] leading-relaxed tracking-tight
                          ${msg.role === 'user'
                          ? 'bg-[#1d9bf0] text-white rounded-3xl rounded-tr-none'
                          : 'bg-transparent text-gray-100 prose prose-invert max-w-none'
                        }
                       `}>
                        {msg.role === 'assistant'
                          ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          : msg.content
                        }
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4 px-12">
                    <div className="flex gap-1.5 py-2">
                      <div className="w-1.5 h-1.5 bg-gray-700 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-700 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-700 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="px-6 sm:px-20 pb-10">
                {error && (
                  <div className="max-w-4xl mx-auto mb-4 bg-red-900/20 border border-red-900/40 text-red-500 px-4 py-2 rounded-2xl text-xs flex justify-between items-center animate-slide-up">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                  </div>
                )}

                <div className="max-w-4xl mx-auto relative group">
                  <form
                    onSubmit={handleSubmit}
                    className="relative flex items-end gap-3 bg-[#0b0b0b] border border-gray-800 group-focus-within:border-gray-700 group-focus-within:bg-[#080808] focus-within:ring-4 focus-within:ring-blue-500/5 rounded-[2.5rem] p-3 pl-6 shadow-2xl transition-all"
                  >
                    <textarea
                      ref={inputRef}
                      className="flex-1 bg-transparent border-none outline-none py-3 text-[16px] resize-none max-h-48 overflow-y-auto text-white placeholder-gray-600 font-medium"
                      placeholder="Ask Autoversio anything..."
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit(e)
                        }
                      }}
                      disabled={isLoading}
                    />

                    <div className="flex items-center gap-2 pb-1.5 pr-1.5">
                      <button
                        type="button"
                        onClick={startRecording}
                        className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse-glow' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                        title="Voice Input"
                      >
                        <Mic className="w-5.5 h-5.5" />
                      </button>
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-3.5 bg-white text-black disabled:bg-gray-800 disabled:text-gray-600 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl disabled:shadow-none"
                      >
                        <Send className="w-5.5 h-5.5" />
                      </button>
                    </div>
                  </form>

                  <div className="absolute top-[-3.5rem] left-0 right-0 flex justify-center pointer-events-none">
                    {isRecording && (
                      <div className="bg-[#1d9bf0] text-white px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-blue-500/30 animate-pulse">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                          Processing...
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 px-6 flex justify-between text-[10px] text-gray-700 font-bold uppercase tracking-widest">
                    <span>Private & Encrypted Node</span>
                    <span>Hold <kbd className="px-1.5 py-0.5 bg-[#161616] border border-gray-800 rounded font-mono">SPACE</kbd> to talk</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'live' && (
            <LiveTranscriber
              onSendToChat={(text: string) => {
                setView('chat')
                sendMessage(text)
              }}
            />
          )}
          {view === 'realtime' && (
            <RealtimeTranscriber
              onSendToChat={(text: string) => {
                setView('chat')
                sendMessage(text)
              }}
            />
          )}
          {view === 'native' && <NativeIntelligence />}
        </div>
      </main>
    </div>
  )
}

export default App
