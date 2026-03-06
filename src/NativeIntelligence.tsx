import { useState, useRef, useEffect, FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
    Mic,
    Send,
    Trash2,
    X,
    Cpu,
    Sparkles,
    Volume2,
    VolumeX
} from 'lucide-react'

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
}

interface NativeIntelligenceProps {
    personality: string;
    onPersonalityChange: (p: any) => void;
    personalities: any;
}

export default function NativeIntelligence({ personality, onPersonalityChange, personalities }: NativeIntelligenceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'I am your **Native Multimodal Agent**. I can hear your voice directly without transcription bottlenecks. \n\nHold **Space** or click the mic to talk to me natively.',
            timestamp: new Date().toLocaleTimeString()
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [health, setHealth] = useState<{ ultravox_connected: boolean, kokoro_connected: boolean, piper_connected?: boolean } | null>(null)
    const [voiceOutput, setVoiceOutput] = useState(true)
    const [ttsEngine, setTtsEngine] = useState<'kokoro' | 'piper'>('kokoro')

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const checkHealth = async () => {
        try {
            const response = await fetch('/api/health')
            const data = await response.json()
            setHealth(data)
        } catch (err) {
            setHealth({ ultravox_connected: false, kokoro_connected: false })
        }
    }

    useEffect(() => {
        checkHealth()
        const interval = setInterval(checkHealth, 15000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in a different input (though this is the main one)
            if (e.target instanceof HTMLInputElement || (e.target instanceof HTMLTextAreaElement && e.target !== inputRef.current)) return

            // If in our textarea, only trigger if it's NOT focused or if we want specific behavior
            // Usually, we want space to work as a shortcut only when NOT typing a message
            if (e.target === inputRef.current) return

            if (e.code === 'Space' && !e.repeat && !isLoading) {
                e.preventDefault()
                if (!isRecording) startRecording()
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' && isRecording) {
                e.preventDefault()
                stopRecording()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [isRecording, isLoading])

    const startRecording = async () => {
        try {
            setError(null)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)

            chunksRef.current = []
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                await sendNativeVoice()
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

    const sendNativeVoice = async () => {
        if (chunksRef.current.length === 0) return
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size < 500) return

        setIsLoading(true)
        const formData = new FormData()
        formData.append('file', blob, 'recording.webm')
        formData.append('prompt', input || "User is asking a question via voice.")

        const systemPrompt = personalities[personality]?.prompt
        if (systemPrompt) {
            formData.append('systemPrompt', systemPrompt)
        }

        try {
            const userMsg: Message = {
                role: 'user',
                content: input || '🎤 (Voice Message)',
                timestamp: new Date().toLocaleTimeString()
            }
            setMessages(prev => [...prev, userMsg])
            setInput('')

            const response = await fetch('/api/chat/native', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) throw new Error('Native Chat Failed')
            const data = await response.json()

            const assistantMsg: Message = {
                role: 'assistant',
                content: data.choices?.[0]?.message?.content || 'Unintelligible response from native model.',
                timestamp: new Date().toLocaleTimeString()
            }
            setMessages(prev => [...prev, assistantMsg])

            if (voiceOutput && assistantMsg.content) {
                playAudio(assistantMsg.content, ttsEngine)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Native Chat Error')
        } finally {
            setIsLoading(false)
        }
    }

    const handleTextSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        // For native agent, even text could be sent to the same endpoint or a hybrid one.
        // Ultravox supports text-only too.
        const userMsg: Message = { role: 'user', content: input, timestamp: new Date().toLocaleTimeString() }
        setMessages(prev => [...prev, userMsg])
        setIsLoading(true)
        setInput('')

        try {
            const formData = new FormData()
            formData.append('prompt', input)

            const systemPrompt = personalities[personality]?.prompt
            if (systemPrompt) {
                formData.append('systemPrompt', systemPrompt)
            }

            const response = await fetch('/api/chat/native', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) throw new Error('Chat API Error')
            const data = await response.json()
            const assistantMsg: Message = {
                role: 'assistant',
                content: data.choices?.[0]?.message?.content || '...',
                timestamp: new Date().toLocaleTimeString()
            }
            setMessages(prev => [...prev, assistantMsg])

            if (voiceOutput && assistantMsg.content) {
                playAudio(assistantMsg.content, ttsEngine)
            }
        } catch (err) {
            setError('Native model text-fallback failed.')
        } finally {
            setIsLoading(false)
        }
    }

    const playAudio = async (text: string, engine: 'kokoro' | 'piper' = 'kokoro') => {
        try {
            const voice = engine === 'piper' ? 'sv_SE-nst-medium' : 'af_heart'
            console.log(`[Native] Requesting TTS (${engine}) for:`, text.substring(0, 30) + '...')
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, engine })
            })
            if (!response.ok) throw new Error(`TTS Failed with status: ${response.status}`)

            const blob = await response.blob()
            console.log('[Native] Audio blob received, size:', blob.size)

            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)

            audio.onplay = () => console.log('[Native] Audio playback started')
            audio.onerror = (e) => console.error('[Native] Audio playback error:', e)

            await audio.play()
        } catch (err) {
            console.error('[Native] Playback error:', err)
        }
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-black">
            <header className="flex items-center justify-between px-6 py-6 glass-header sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Cpu className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight uppercase">Native Intelligence</h2>
                        <div className="flex items-center gap-1.5 text-[9px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">
                            <Sparkles className="w-3 h-3" />
                            Next-Gen Multimodal (v2)
                        </div>
                    </div>
                </div>

                {/* Personality Selector */}
                <div className="hidden md:flex items-center bg-[#111111] border border-gray-800 rounded-full p-1 gap-1">
                    {Object.entries(personalities).map(([key, p]: [string, any]) => (
                        <button
                            key={key}
                            onClick={() => onPersonalityChange(key)}
                            className={`
                        flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                        ${personality === key
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                      `}
                        >
                            <p.icon className={`w-3.5 h-3.5 ${personality === key ? 'text-white' : p.color}`} />
                            {p.name}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-gray-800 rounded-full">
                        <div className={`w-1.5 h-1.5 rounded-full ${health?.ultravox_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Native {health?.ultravox_connected ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {/* TTS Engine Toggle */}
                    {voiceOutput && (
                        <div className="flex items-center bg-[#111111] border border-gray-800 rounded-full overflow-hidden">
                            <button
                                onClick={() => setTtsEngine('kokoro')}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${ttsEngine === 'kokoro'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                title="Kokoro TTS (English)"
                            >
                                🇬🇧 EN
                            </button>
                            <button
                                onClick={() => setTtsEngine('piper')}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${ttsEngine === 'piper'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                title="Piper TTS (Swedish)"
                            >
                                🇸🇪 SV
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setVoiceOutput(!voiceOutput)}
                        className={`p-2 rounded-lg transition-all ${voiceOutput ? 'text-purple-500 bg-purple-500/10' : 'text-gray-500 hover:text-white'}`}
                        title={voiceOutput ? "Voice Output On" : "Voice Output Off"}
                    >
                        {voiceOutput ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>

                    <button onClick={() => setMessages([])} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-20 py-10 space-y-12">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex w-full group animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col gap-1 max-w-[90%] sm:max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest px-1">
                                {msg.role === 'assistant' ? 'Native Agent' : 'User'} — {msg.timestamp}
                            </div>
                            <div className={`
                px-5 py-3.5 text-[15.5px] leading-relaxed tracking-tight
                ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white rounded-3xl rounded-tr-none'
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
                            <div className="w-1.5 h-1.5 bg-purple-700 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-purple-700 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-purple-700 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="px-6 sm:px-20 pb-10">
                {error && (
                    <div className="max-w-4xl mx-auto mb-4 bg-red-900/20 border border-red-900/40 text-red-500 px-4 py-2 rounded-2xl text-xs flex justify-between items-center animate-slide-up">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                    </div>
                )}

                <div className="max-w-4xl mx-auto relative group">
                    <form
                        onSubmit={handleTextSubmit}
                        className="relative flex items-end gap-3 bg-[#0b0b0b] border border-gray-800 group-focus-within:border-purple-500/50 group-focus-within:bg-[#080808] focus-within:ring-4 focus-within:ring-purple-500/5 rounded-[2.5rem] p-3 pl-6 shadow-2xl transition-all"
                    >
                        <textarea
                            ref={inputRef}
                            className="flex-1 bg-transparent border-none outline-none py-3 text-[16px] resize-none max-h-48 overflow-y-auto text-white placeholder-gray-600 font-medium"
                            placeholder="Talk natively to the agent..."
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleTextSubmit(e)
                                }
                            }}
                            disabled={isLoading}
                        />

                        <div className="flex items-center gap-2 pb-1.5 pr-1.5">
                            <button
                                type="button"
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onMouseLeave={stopRecording}
                                className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-purple-400 hover:bg-gray-800'}`}
                                title="Hold to Speak Natively"
                            >
                                <Mic className="w-5.5 h-5.5" />
                            </button>
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="p-3.5 bg-purple-600 text-white disabled:bg-gray-800 disabled:text-gray-600 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl disabled:shadow-none"
                            >
                                <Send className="w-5.5 h-5.5" />
                            </button>
                        </div>
                    </form>

                    <div className="absolute top-[-3.5rem] left-0 right-0 flex justify-center pointer-events-none">
                        {isRecording && (
                            <div className="bg-purple-600 text-white px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-purple-500/30 animate-pulse">
                                <span className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                    Capturing Audio Weights...
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 px-6 flex justify-between text-[10px] text-gray-700 font-bold uppercase tracking-widest">
                        <span>Direct Multimodal Link</span>
                        <span>Hold Mic or Space to talk</span>
                    </div>
                </div>
            </div>
        </div >
    )
}
