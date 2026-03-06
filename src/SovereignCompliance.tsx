import { Shield, Mic, Zap, CheckCircle, Info, ChevronRight, Gavel, Globe } from 'lucide-react';

export default function SovereignCompliance() {
    return (
        <div className="flex-1 overflow-y-auto bg-[#050505] text-white p-8 md:p-12">
            <div className="max-w-4xl mx-auto space-y-16">
                {/* Header Section */}
                <section className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
                        <Shield className="w-4 h-4" />
                        <span>Sovereign AI & Data Privacy</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
                        Enterprise Trust in the <br />Age of AI.
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
                        Autoversio is built for organizations that cannot afford to compromise on data sovereignty.
                        We provide a complete, private infrastructure that keeps your most sensitive information
                        within your control.
                    </p>
                </section>

                {/* GDPR & EU AI Act Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-gray-800 space-y-4 hover:border-purple-500/30 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <Gavel className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-semibold">GDPR Compliant</h3>
                        <p className="text-gray-400 leading-relaxed">
                            Zero data leakage. Our architecture ensures that voice data and transcriptions
                            never leave your sovereign boundary. No logs are sent to third parties,
                            meeting the strictest privacy requirements.
                        </p>
                    </div>
                    <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-gray-800 space-y-4 hover:border-purple-500/30 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-semibold">EU AI Act Ready</h3>
                        <p className="text-gray-400 leading-relaxed">
                            We provide full transparency and auditability. By hosting your own models,
                            you ensure compliance with upcoming EU regulations regarding high-risk AI
                            systems and data governance.
                        </p>
                    </div>
                </div>

                {/* Hosting Models Section */}
                <section className="space-y-10">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-bold">The Sovereignty Spectrum</h2>
                        <p className="text-gray-400">Choose the deployment model that fits your security profile.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-gray-800 space-y-4">
                            <div className="text-purple-400 font-bold text-sm tracking-widest uppercase">Layer 01</div>
                            <h4 className="text-xl font-bold">Public Cloud</h4>
                            <p className="text-sm text-gray-500 italic">Optional</p>
                            <p className="text-gray-400 text-sm">Convenience at the cost of control. Standard SaaS model.</p>
                            <div className="pt-4 border-t border-gray-900 group flex items-center gap-2 text-xs text-red-500/70 italic">
                                <span>Not Recommended for sensitive data</span>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-purple-500/5 border border-purple-500/30 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3">
                                <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500 text-white uppercase">Most Popular</div>
                            </div>
                            <div className="text-purple-400 font-bold text-sm tracking-widest uppercase">Layer 02</div>
                            <h4 className="text-xl font-bold">Sovereign Cloud</h4>
                            <p className="text-sm text-purple-400/70 italic">Cloud, but yours</p>
                            <p className="text-gray-400 text-sm">Isolated virtual hardware in highly secure, regional data centers (e.g., Easypanel).</p>
                            <div className="pt-4 border-t border-purple-500/10 flex items-center gap-2 text-xs text-purple-400">
                                <CheckCircle className="w-3 h-3" />
                                <span>Regional Data Privacy</span>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-gray-800 space-y-4">
                            <div className="text-purple-400 font-bold text-sm tracking-widest uppercase">Layer 03</div>
                            <h4 className="text-xl font-bold">Local Edge</h4>
                            <p className="text-sm text-green-400/70 italic">Maximum Security</p>
                            <p className="text-gray-400 text-sm">Deployment on your own physical hardware (Air-gapped compatible). No external pipes.</p>
                            <div className="pt-4 border-t border-gray-900 flex items-center gap-2 text-xs text-green-400">
                                <CheckCircle className="w-3 h-3" />
                                <span>100% Data Sovereignty</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Tech Stack Section */}
                <section className="space-y-12">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold">The Tech Stack</h2>
                        <p className="text-gray-400 text-sm">100% open-source. 100% GDPR compliant. Zero external dependencies.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* STT - Whisper */}
                        <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-gray-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <Mic className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Whisper Large v3</h4>
                                        <p className="text-xs text-gray-500">Speech-to-Text (STT)</p>
                                    </div>
                                </div>
                                <a href="https://huggingface.co/openai/whisper-large-v3" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                                    HuggingFace →
                                </a>
                            </div>
                            <p className="text-gray-400 text-sm">
                                OpenAI's flagship speech recognition model. Runs locally via vLLM for maximum privacy.
                                Supports 99+ languages with state-of-the-art accuracy.
                            </p>
                            <div className="pt-3 border-t border-gray-900 flex items-center gap-2 text-xs text-gray-500">
                                <span className="px-2 py-1 rounded bg-gray-900">GPU</span>
                                <span>~8GB VRAM</span>
                            </div>
                        </div>

                        {/* LLM - vLLM */}
                        <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-gray-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Any LLM</h4>
                                        <p className="text-xs text-gray-500">Reasoning & Response</p>
                                    </div>
                                </div>
                                <a href="https://docs.vllm.ai" target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline">
                                    vLLM Docs →
                                </a>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Any OpenAI-compatible LLM via vLLM. Qwen, Llama, Mistral — you choose the model that fits your needs.
                                Full streaming support with attention caching.
                            </p>
                            <div className="pt-3 border-t border-gray-900 flex items-center gap-2 text-xs text-gray-500">
                                <span className="px-2 py-1 rounded bg-gray-900">GPU</span>
                                <span>Variable (8-128GB)</span>
                            </div>
                        </div>

                        {/* Native Audio LLM - Ultravox */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a0a0a] to-[#0f0a1a] border border-purple-500/30 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Ultravox v0.5</h4>
                                        <p className="text-xs text-purple-400/60">Native Audio LLM</p>
                                    </div>
                                </div>
                                <a href="https://huggingface.co/fixie-ai/ultravox-v0_5-llama-3_1-8b" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">
                                    HuggingFace →
                                </a>
                            </div>
                            <p className="text-gray-300 text-sm">
                                Next-generation multimodal model that processes audio directly as embeddings — no STT bottleneck.
                                Better prosody understanding, lower latency, and native emotional nuance detection.
                            </p>
                            <div className="pt-3 border-t border-purple-500/20 flex items-center gap-2 text-xs text-purple-400/60">
                                <span className="px-2 py-1 rounded bg-purple-500/20">GPU</span>
                                <span>~16GB VRAM</span>
                            </div>
                        </div>

                        {/* TTS - Kokoro */}
                        <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-gray-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Kokoro-82M</h4>
                                        <p className="text-xs text-gray-500">English TTS</p>
                                    </div>
                                </div>
                                <a href="https://github.com/remsky/kokoro-fastapi" target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:underline">
                                    GitHub →
                                </a>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Lightweight ONNX-based TTS with natural, expressive English voices.
                                Runs on CPU with minimal resource usage. Multiple voice presets available.
                            </p>
                            <div className="pt-3 border-t border-gray-900 flex items-center gap-2 text-xs text-gray-500">
                                <span className="px-2 py-1 rounded bg-gray-900">CPU</span>
                                <span>~1GB RAM</span>
                            </div>
                        </div>

                        {/* TTS - Piper */}
                        <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-gray-800 space-y-4 md:col-span-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Piper</h4>
                                        <p className="text-xs text-gray-500">Swedish TTS</p>
                                    </div>
                                </div>
                                <a href="https://github.com/rhasspy/piper" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline">
                                    GitHub →
                                </a>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Fast, neural text-to-speech system optimized for Swedish and English.
                                Uses NST (Norwegian Speech Technology) voices for authentic Swedish pronunciation.
                                Zero cloud dependencies — 100% local processing.
                            </p>
                            <div className="pt-3 border-t border-gray-900 flex items-center gap-2 text-xs text-gray-500">
                                <span className="px-2 py-1 rounded bg-gray-900">CPU</span>
                                <span>~500MB RAM</span>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Visualization */}
                    <div className="p-8 rounded-[2.5rem] bg-[#0a0a0a] border border-gray-800 space-y-6">
                        <h3 className="text-xl font-bold text-center">Data Flow</h3>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <div className="px-4 py-2 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-medium">🎙️ Voice Input</div>
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                            <div className="px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sm font-medium text-blue-400">Whisper v3</div>
                            <span className="text-gray-600 text-sm">eller</span>
                            <div className="px-4 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-sm font-medium text-purple-400">Ultravox</div>
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                            <div className="px-4 py-2 rounded-2xl bg-green-500/10 border border-green-500/20 text-sm font-medium text-green-400">LLM</div>
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                            <div className="px-4 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-sm font-medium text-orange-400">Kokoro</div>
                            <div className="px-2 py-2 rounded-2xl text-gray-600 text-sm">/</div>
                            <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-400">Piper</div>
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                            <div className="px-4 py-2 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-medium">🔊 Audio Output</div>
                        </div>
                        <p className="text-center text-xs text-gray-500 italic pt-2">
                            Full voice loop — all processing happens within your sovereign infrastructure
                        </p>
                    </div>
                </section>

                {/* FAQ Section Footer */}
                <section className="pt-12 border-t border-gray-900 space-y-8">
                    <h3 className="text-2xl font-bold">Common Questions</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h5 className="font-semibold flex items-center gap-2">
                                <Info className="w-4 h-4 text-purple-400" />
                                Where is my data stored?
                            </h5>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                By default, Autoversio stores nothing. Files are processed in volatile memory on your own
                                container instance. If you choose to enable history, it is encrypted and stored on your
                                dedicated database, never transmitted back to Autoversio central.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h5 className="font-semibold flex items-center gap-2">
                                <Info className="w-4 h-4 text-purple-400" />
                                Is this really safe for GDPR?
                            </h5>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Yes. Since you control the endpoint (your Easypanel or On-Prem server), you are the
                                Data Controller. You have 100% visibility into the logs and infrastructure.
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="py-12 text-center text-gray-600 text-sm">
                    <p>© 2026 Autoversio Sovereign Intelligence. All rights reserved.</p>
                    <p className="mt-2 flex items-center justify-center gap-2">
                        <Globe className="w-3 h-3" />
                        Designed for Data Sovereignty
                    </p>
                </footer>
            </div>
        </div>
    );
}
