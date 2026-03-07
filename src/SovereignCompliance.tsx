import { Shield, Info, Gavel, Globe, CheckCircle } from 'lucide-react'; // eslint-disable-line

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

                {/* Call to Action Section */}
                <section className="relative p-12 rounded-[3rem] bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="relative z-10 text-center space-y-6">
                        <h3 className="text-3xl font-bold">Need Help Delivering a Great User Experience?</h3>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            Reach out if you want to know how to deliver a great user experience
                            and be 100% compliant with private AI regulations.
                        </p>
                        <a
                            href="https://www.autoversio.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all hover:translate-y-[-2px]"
                        >
                            Contact Us
                        </a>
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
                        <div className="space-y-2">
                            <h5 className="font-semibold flex items-center gap-2">
                                <Info className="w-4 h-4 text-purple-400" />
                                Can I use this with sensitive healthcare or financial data?
                            </h5>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Absolutely. Our Local Edge deployment option supports air-gapped environments, making it
                                suitable for HIPAA, GDPR, and financial services compliance. All processing happens within
                                your controlled infrastructure with no external data transmission.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h5 className="font-semibold flex items-center gap-2">
                                <Info className="w-4 h-4 text-purple-400" />
                                What happens if my internet connection goes down?
                            </h5>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                With Local Edge deployment, your system continues operating independently. Since all models
                                run on your hardware, internet connectivity is only needed for updates and backups—not
                                for daily operations.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h5 className="font-semibold flex items-center gap-2">
                                <Info className="w-4 h-4 text-purple-400" />
                                How do I ensure EU AI Act compliance?
                            </h5>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                By hosting models locally, you maintain full transparency and auditability. You control
                                training data, can document all processing activities, and ensure no data crosses borders
                                without consent—key requirements under the EU AI Act for high-risk systems.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h5 className="font-semibold flex items-center gap-2">
                                <Info className="w-4 h-4 text-purple-400" />
                                What support and maintenance is included?
                            </h5>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                We provide comprehensive support including model updates, security patches, and technical
                                assistance. Our team helps you optimize performance and stay compliant with evolving
                                regulations. Custom SLAs available for enterprise deployments.
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
