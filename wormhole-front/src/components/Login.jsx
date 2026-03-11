import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Globe } from './Globe';

const INDUSTRIES = [
    { id: 'consultation', name: 'Consultation', icon: '🏢', desc: 'Client advisory & project oversight', color: 'from-blue-500 to-cyan-400' },
    { id: 'oil_gas', name: 'Oil & Gas', icon: '🛢️', desc: 'Pipeline & facility monitoring', color: 'from-amber-500 to-orange-500' },
    { id: 'security', name: 'Security', icon: '🔒', desc: 'Surveillance & perimeter defense', color: 'from-red-500 to-rose-500' },
    { id: 'agriculture', name: 'Agriculture', icon: '🌾', desc: 'Crop monitoring & field mapping', color: 'from-green-500 to-emerald-400' },
    { id: 'construction', name: 'Construction', icon: '🏗️', desc: 'Site progress & safety compliance', color: 'from-violet-500 to-purple-500' },
];

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [orgName, setOrgName] = useState('');
    const [industry, setIndustry] = useState('');
    const [localError, setLocalError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1); // 1 = auth, 2 = org setup (signup only)

    const { signIn, signUp, signInWithGoogle, signInWithGitHub, error } = useAuth();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                if (step === 1) {
                    if (!username.trim()) {
                        setLocalError('Username is required');
                        setIsSubmitting(false);
                        return;
                    }
                    setStep(2);
                    setIsSubmitting(false);
                    return;
                }
                if (!industry) {
                    setLocalError('Please select your industry');
                    setIsSubmitting(false);
                    return;
                }
                await signUp(email, password, username);
                // Store org info in localStorage for now (pre-funding, no backend org table yet)
                localStorage.setItem('wormhole_org', JSON.stringify({
                    name: orgName || `${username}'s Organization`,
                    industry,
                    created: new Date().toISOString()
                }));
            }
        } catch (err) {
            setLocalError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-bornebit-gradient relative overflow-hidden">
            {/* Background Globe - only on desktop for performance */}
            {!isMobile && <Globe isBackground={true} />}

            {/* Mobile gradient background */}
            {isMobile && (
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-bornebit-primary/5 via-transparent to-black/60" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-bornebit-primary/10 rounded-full blur-3xl" />
                </div>
            )}

            {/* Login Card */}
            <div className={`relative z-10 w-full ${isMobile ? 'max-w-full px-4' : 'max-w-md mx-4'}`}>
                <div className={`bg-bornebit-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl`}>
                    {/* Logo */}
                    <div className="text-center mb-5 md:mb-6">
                        {/* Wormhole Icon */}
                        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-bornebit-primary to-bornebit-accent rounded-2xl rotate-12 opacity-20 blur-sm"></div>
                            <div className="relative w-full h-full bg-gradient-to-br from-bornebit-primary to-bornebit-accent rounded-2xl flex items-center justify-center shadow-lg shadow-bornebit-primary/30">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 md:w-10 md:h-10 text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-bornebit-primary tracking-tight">
                            WORMHOLE
                        </h1>
                        <p className="text-bornebit-muted text-xs md:text-sm mt-1">
                            Multi-Industry Drone Streaming SaaS
                        </p>
                        {/* Industry badges */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                            {INDUSTRIES.map(ind => (
                                <span key={ind.id} className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-gray-500">
                                    {ind.icon} {ind.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Toggle */}
                    <div className="flex bg-black/30 rounded-xl p-1 mb-5 md:mb-6">
                        <button
                            onClick={() => { setIsLogin(true); setStep(1); setLocalError(''); }}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${isLogin
                                ? 'bg-bornebit-primary text-white shadow-lg shadow-bornebit-primary/25'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setStep(1); setLocalError(''); }}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${!isLogin
                                ? 'bg-bornebit-primary text-white shadow-lg shadow-bornebit-primary/25'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Step indicator for signup */}
                    {!isLogin && (
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className={`w-2 h-2 rounded-full transition-all ${step >= 1 ? 'bg-bornebit-primary' : 'bg-gray-600'}`}></div>
                            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-bornebit-primary' : 'bg-gray-700'}`}></div>
                            <div className={`w-2 h-2 rounded-full transition-all ${step >= 2 ? 'bg-bornebit-primary' : 'bg-gray-600'}`}></div>
                            <span className="text-[10px] text-gray-500 ml-2">{step === 1 ? 'Account' : 'Organization'}</span>
                        </div>
                    )}

                    {/* Error Display */}
                    {(localError || error) && (
                        <div className="bg-red-500/15 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <span>{localError || error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Step 1: Account details */}
                        {(isLogin || step === 1) && (
                            <>
                                {!isLogin && (
                                    <div>
                                        <label className="block text-xs text-bornebit-muted uppercase tracking-wider mb-2">
                                            Username
                                        </label>
                                        <div className="relative">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                            </svg>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-gray-500 focus:border-bornebit-primary focus:outline-none focus:ring-1 focus:ring-bornebit-primary transition-all"
                                                placeholder="Choose a username"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs text-bornebit-muted uppercase tracking-wider mb-2">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-gray-500 focus:border-bornebit-primary focus:outline-none focus:ring-1 focus:ring-bornebit-primary transition-all"
                                            placeholder="you@company.com"
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-bornebit-muted uppercase tracking-wider mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-12 py-3.5 text-white placeholder-gray-500 focus:border-bornebit-primary focus:outline-none focus:ring-1 focus:ring-bornebit-primary transition-all"
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {isLogin && (
                                    <div className="text-right">
                                        <a href="#" className="text-xs text-bornebit-primary hover:text-bornebit-accent transition-colors">
                                            Forgot password?
                                        </a>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Step 2: Organization setup (signup only) */}
                        {!isLogin && step === 2 && (
                            <>
                                <div>
                                    <label className="block text-xs text-bornebit-muted uppercase tracking-wider mb-2">
                                        Organization Name
                                    </label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-gray-500 focus:border-bornebit-primary focus:outline-none focus:ring-1 focus:ring-bornebit-primary transition-all"
                                            placeholder="Your company or agency name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-bornebit-muted uppercase tracking-wider mb-2">
                                        Industry
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {INDUSTRIES.map(ind => (
                                            <button
                                                key={ind.id}
                                                type="button"
                                                onClick={() => setIndustry(ind.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${industry === ind.id
                                                    ? 'border-bornebit-primary bg-bornebit-primary/10 shadow-lg shadow-bornebit-primary/10'
                                                    : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                                                    }`}
                                            >
                                                <span className="text-xl">{ind.icon}</span>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-white">{ind.name}</div>
                                                    <div className="text-[10px] text-gray-500">{ind.desc}</div>
                                                </div>
                                                {industry === ind.id && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-bornebit-primary">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full text-sm text-gray-500 hover:text-gray-300 py-2 transition-colors"
                                >
                                    ← Back to account details
                                </button>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-bornebit-primary to-bornebit-accent text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-bornebit-primary/25 active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : isLogin ? 'Sign In' : step === 1 ? 'Next: Setup Organization →' : 'Create Account & Organization'}
                        </button>
                    </form>

                    {/* Divider */}
                    {(isLogin || step === 1) && (
                        <>
                            <div className="flex items-center gap-4 my-5 md:my-6">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-xs text-bornebit-muted uppercase">or continue with</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            {/* Social Buttons */}
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <button
                                    onClick={signInWithGoogle}
                                    className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-3 text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98]"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="text-sm font-medium">Google</span>
                                </button>
                                <button
                                    onClick={signInWithGitHub}
                                    className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-3 text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.98]"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    <span className="text-sm font-medium">GitHub</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Demo Access */}
                    {isLogin && (
                        <div className="mt-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-xs text-bornebit-muted uppercase">or</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>
                            <button
                                id="demo-access-btn"
                                type="button"
                                onClick={async () => {
                                    setLocalError('');
                                    setIsSubmitting(true);
                                    try {
                                        // Store a demo org so the app has industry context
                                        localStorage.setItem('wormhole_org', JSON.stringify({
                                            name: 'Demo Organization',
                                            industry: 'security',
                                            created: new Date().toISOString()
                                        }));
                                        await signIn('demo@bornebit.com', 'demo123');
                                    } catch (err) {
                                        setLocalError(err.message);
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                disabled={isSubmitting}
                                className="w-full relative overflow-hidden group bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-400/60 rounded-xl py-3 text-amber-400 hover:text-amber-300 transition-all font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-400/10 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                </svg>
                                Try Demo — 10 min free
                                <span className="ml-1 text-[10px] bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-mono">NO SIGNUP</span>
                            </button>
                            <p className="text-center text-[10px] text-gray-600 mt-2">Demo resets after 10 minutes. No credit card required.</p>
                        </div>
                    )}

                    {/* Powered by */}
                    <div className="mt-6 text-center">
                        <p className="text-[10px] md:text-xs text-gray-600">
                            Powered by <span className="text-bornebit-primary font-semibold">Bornebit</span> & Spatial Systems
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
