import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Globe } from './Globe';
import {
  User, Mail, Lock, Eye, EyeOff, Building2, Play,
  ChevronRight, ArrowLeft, CheckCircle2, Sparkles, Zap
} from 'lucide-react';

const INDUSTRIES = [
    { id: 'consultation', name: 'Consultation', icon: '🏢', desc: 'Client advisory & project oversight', color: 'from-blue-500 to-cyan-400' },
    { id: 'oil_gas', name: 'Oil & Gas', icon: '🛢️', desc: 'Pipeline & facility monitoring', color: 'from-amber-500 to-orange-500' },
    { id: 'security', name: 'Security', icon: '🔒', desc: 'Surveillance & perimeter defense', color: 'from-red-500 to-rose-500' },
    { id: 'agriculture', name: 'Agriculture', icon: '🌾', desc: 'Crop monitoring & field mapping', color: 'from-green-500 to-emerald-400' },
    { id: 'construction', name: 'Construction', icon: '🏗️', desc: 'Site progress & safety compliance', color: 'from-violet-500 to-purple-500' },
];

/* ─── MagicUI: Meteor Shower Background ─── */
const MeteorShower = () => {
  const meteors = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 8,
    duration: Math.random() * 3 + 2,
    size: Math.random() * 1.5 + 0.5,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {meteors.map(m => (
        <div
          key={m.id}
          className="absolute"
          style={{
            left: m.left,
            top: '-5%',
            width: `${m.size}px`,
            height: `${m.size * 60}px`,
            background: `linear-gradient(to bottom, rgba(255,87,34,0.6), transparent)`,
            borderRadius: '50%',
            animation: `meteor-fall ${m.duration}s linear ${m.delay}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
};

/* ─── MagicUI: Animated Grid Background ─── */
const AnimatedGrid = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]"
    style={{
      backgroundImage: `
        linear-gradient(rgba(255,87,34,0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,87,34,0.3) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
      animation: 'grid-fade 6s ease-in-out infinite',
    }}
  />
);

/* ─── MagicUI: Orbiting Dots ─── */
const OrbitingDots = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '-20%' }}>
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="absolute w-1.5 h-1.5 rounded-full bg-bornebit-primary/60"
        style={{
          '--orbit-radius': `${140 + i * 60}px`,
          animation: `orbit ${8 + i * 4}s linear infinite`,
          animationDelay: `${i * 2}s`,
        }}
      />
    ))}
  </div>
);

/* ─── MagicUI: Shine Border Card ─── */
const ShineBorderCard = ({ children, className = '' }) => (
  <div className={`relative ${className}`}>
    {/* Rotating gradient border */}
    <div
      className="absolute -inset-[1px] rounded-3xl opacity-40"
      style={{
        background: 'conic-gradient(from 0deg, transparent, #FF5722, transparent, #FF9100, transparent)',
        animation: 'shimmer-move 4s linear infinite',
        backgroundSize: '200% 200%',
      }}
    />
    {/* Shine sweep overlay */}
    <div className="absolute inset-0 rounded-3xl overflow-hidden">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,87,34,0.06) 45%, rgba(255,87,34,0.15) 50%, rgba(255,87,34,0.06) 55%, transparent 60%)',
          animation: 'shine-sweep 3s ease-in-out infinite',
        }}
      />
    </div>
    {/* Card content */}
    <div className="relative glass-morphism-strong rounded-3xl overflow-hidden">
      {children}
    </div>
  </div>
);

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
    const [step, setStep] = useState(1);

    const { signIn, signUp, signInWithGoogle, signInWithGitHub, error } = useAuth();

    // Auto-login as demo when opening via QR code or directly on tunnel domain
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const hasTunnelParam = params.get('tunnel');
      const isTunnelHost = window.location.origin.includes('trycloudflare.com') || window.location.origin.includes('ngrok');

      if (hasTunnelParam || isTunnelHost) {
        signIn('demo@bornebit.com', 'demo123').catch(() => {});
      }
    }, [signIn]);

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

    const inputClass = "w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-600 focus:border-bornebit-primary/60 focus:outline-none focus:ring-2 focus:ring-bornebit-primary/20 focus:bg-white/[0.05] transition-all duration-300 text-sm font-[family-name:'JetBrains_Mono',monospace]";

    const formVariants = {
      initial: { opacity: 0, x: 20, filter: 'blur(4px)' },
      animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
      exit: { opacity: 0, x: -20, filter: 'blur(4px)' },
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#030014] relative overflow-hidden">
            {/* Layered backgrounds */}
            <AnimatedGrid />
            <MeteorShower />

            {/* Background Globe - only on desktop */}
            {!isMobile && <Globe isBackground={true} />}

            {/* Mesh gradient blobs */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-bornebit-primary/[0.07] rounded-full blur-[120px]" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/[0.05] rounded-full blur-[100px]" />
              <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-cyan-500/[0.04] rounded-full blur-[80px]" />
            </div>

            {isMobile && <OrbitingDots />}

            {/* Login Card */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`relative z-10 w-full ${isMobile ? 'max-w-full px-4' : 'max-w-[440px] mx-4'} group`}
            >
              <ShineBorderCard>
                <div className="p-7 md:p-9">
                    {/* Logo */}
                    <div className="text-center mb-7">
                        {/* Animated Wormhole Icon */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                          className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 relative"
                        >
                            {/* Pulse rings */}
                            <div className="absolute inset-0 rounded-2xl" style={{ animation: 'pulse-ring 2s ease-out infinite' }}>
                              <div className="w-full h-full rounded-2xl border border-bornebit-primary/30" />
                            </div>
                            <div className="absolute inset-0 rounded-2xl" style={{ animation: 'pulse-ring 2s ease-out 0.5s infinite' }}>
                              <div className="w-full h-full rounded-2xl border border-bornebit-primary/20" />
                            </div>
                            {/* Icon */}
                            <div className="relative w-full h-full bg-gradient-to-br from-bornebit-primary to-bornebit-accent rounded-2xl flex items-center justify-center shadow-xl shadow-bornebit-primary/40">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 md:w-10 md:h-10 text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </motion.div>
                        <h1 className="text-3xl md:text-4xl font-black gradient-text-animated tracking-tight">
                            WORMHOLE
                        </h1>
                        <p className="text-gray-500 text-xs mt-2 font-[family-name:'JetBrains_Mono',monospace] tracking-wider">
                            Multi-Industry Drone Streaming SaaS
                        </p>
                        {/* Industry badges */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                            {INDUSTRIES.map(ind => (
                                <motion.span
                                  key={ind.id}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.4 + INDUSTRIES.indexOf(ind) * 0.05 }}
                                  className="text-[10px] bg-white/[0.04] border border-white/[0.08] rounded-full px-2.5 py-1 text-gray-500 hover:text-white hover:border-bornebit-primary/30 hover:bg-bornebit-primary/5 transition-all duration-300 cursor-default"
                                >
                                    {ind.icon} {ind.name}
                                </motion.span>
                            ))}
                        </div>
                    </div>

                    {/* Toggle */}
                    <div className="flex bg-white/[0.03] rounded-2xl p-1.5 mb-6 border border-white/[0.06]">
                        {['Sign In', 'Sign Up'].map((label, idx) => {
                          const active = idx === 0 ? isLogin : !isLogin;
                          return (
                            <button
                              key={label}
                              onClick={() => { idx === 0 ? setIsLogin(true) : setIsLogin(false); setStep(1); setLocalError(''); }}
                              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 relative ${
                                active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              {active && (
                                <motion.div
                                  layoutId="auth-toggle"
                                  className="absolute inset-0 bg-gradient-to-r from-bornebit-primary/20 to-bornebit-accent/10 rounded-xl border border-bornebit-primary/30"
                                  style={{ boxShadow: '0 0 20px rgba(255,87,34,0.15)' }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                              )}
                              <span className="relative z-10">{label}</span>
                            </button>
                          );
                        })}
                    </div>

                    {/* Step indicator for signup */}
                    {!isLogin && (
                        <div className="flex items-center justify-center gap-3 mb-5">
                            <div className={`w-8 h-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-bornebit-primary' : 'bg-gray-700'}`} />
                            <div className={`w-8 h-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-bornebit-primary' : 'bg-gray-700'}`} />
                            <span className="text-[10px] text-gray-500 ml-2 font-[family-name:'JetBrains_Mono',monospace]">
                              {step === 1 ? 'ACCOUNT' : 'ORGANIZATION'}
                            </span>
                        </div>
                    )}

                    {/* Error Display */}
                    <AnimatePresence>
                    {(localError || error) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3.5 rounded-2xl mb-5 flex items-start gap-2.5 overflow-hidden"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <span className="text-sm">{localError || error}</span>
                        </motion.div>
                    )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                        {/* Step 1: Account details */}
                        {(isLogin || step === 1) && (
                            <motion.div
                              key="step1"
                              variants={formVariants}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={{ duration: 0.3 }}
                              className="space-y-4"
                            >
                                {!isLogin && (
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">
                                            Username
                                        </label>
                                        <div className="relative">
                                            <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className={inputClass}
                                                placeholder="Choose a username"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={inputClass}
                                            placeholder="you@company.com"
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`${inputClass} !pr-12`}
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 p-1 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {isLogin && (
                                    <div className="text-right">
                                        <a href="#" className="text-xs text-bornebit-primary/70 hover:text-bornebit-primary transition-colors">
                                            Forgot password?
                                        </a>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 2: Organization setup (signup only) */}
                        {!isLogin && step === 2 && (
                            <motion.div
                              key="step2"
                              variants={formVariants}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={{ duration: 0.3 }}
                              className="space-y-4"
                            >
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">
                                        Organization Name
                                    </label>
                                    <div className="relative">
                                        <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                        <input
                                            type="text"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className={inputClass}
                                            placeholder="Your company or agency name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">
                                        Industry
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {INDUSTRIES.map(ind => (
                                            <motion.button
                                                key={ind.id}
                                                type="button"
                                                onClick={() => setIndustry(ind.id)}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 text-left ${
                                                  industry === ind.id
                                                    ? 'border-bornebit-primary/50 bg-bornebit-primary/10 shadow-lg shadow-bornebit-primary/10'
                                                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <span className="text-xl">{ind.icon}</span>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-white">{ind.name}</div>
                                                    <div className="text-[10px] text-gray-500">{ind.desc}</div>
                                                </div>
                                                {industry === ind.id && (
                                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                    <CheckCircle2 className="w-5 h-5 text-bornebit-primary" />
                                                  </motion.div>
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-300 py-2 transition-colors"
                                >
                                    <ArrowLeft size={14} /> Back to account details
                                </button>
                            </motion.div>
                        )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={isSubmitting}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-bornebit-primary to-bornebit-accent text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-bornebit-primary/25 mt-2"
                        >
                            {/* Shine sweep */}
                            <div className="absolute inset-0" style={{
                              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                              animation: 'shine-sweep 3s ease-in-out infinite',
                            }} />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                            {isSubmitting ? (
                                <>
                                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                                    <Sparkles size={18} />
                                  </motion.div>
                                  Processing...
                                </>
                            ) : isLogin ? (
                                <>Sign In <ChevronRight size={16} /></>
                            ) : step === 1 ? (
                                <>Next: Setup Organization <ChevronRight size={16} /></>
                            ) : (
                                <>Create Account & Organization <Zap size={16} /></>
                            )}
                            </span>
                        </motion.button>
                    </form>

                    {/* Divider + Social */}
                    {(isLogin || step === 1) && (
                        <>
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em]">or continue with</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <motion.button
                                    onClick={signInWithGoogle}
                                    whileHover={{ scale: 1.02, y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 text-gray-400 hover:bg-white/[0.06] hover:border-white/15 hover:text-white transition-all duration-300"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="text-sm font-medium">Google</span>
                                </motion.button>
                                <motion.button
                                    onClick={signInWithGitHub}
                                    whileHover={{ scale: 1.02, y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 text-gray-400 hover:bg-white/[0.06] hover:border-white/15 hover:text-white transition-all duration-300"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    <span className="text-sm font-medium">GitHub</span>
                                </motion.button>
                            </div>
                        </>
                    )}

                    {/* Demo Access */}
                    {isLogin && (
                        <div className="mt-5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                                <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em]">or</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                            </div>
                            <motion.button
                                id="demo-access-btn"
                                type="button"
                                onClick={async () => {
                                    setLocalError('');
                                    setIsSubmitting(true);
                                    try {
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
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full relative overflow-hidden group bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.08] border border-amber-500/20 hover:border-amber-400/40 rounded-2xl py-3.5 text-amber-400 hover:text-amber-300 transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-400/[0.08] to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <Play size={14} className="relative z-10" />
                                <span className="relative z-10">Try Demo — 10 min free</span>
                                <span className="relative z-10 ml-1 text-[9px] bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded-full font-[family-name:'JetBrains_Mono',monospace] tracking-wider">NO SIGNUP</span>
                            </motion.button>
                            <p className="text-center text-[10px] text-gray-700 mt-2 font-[family-name:'JetBrains_Mono',monospace]">
                              Demo resets after 10 minutes. No credit card required.
                            </p>
                        </div>
                    )}

                    {/* Powered by */}
                    <div className="mt-7 text-center">
                        <p className="text-[10px] text-gray-700 font-[family-name:'JetBrains_Mono',monospace] tracking-wider">
                            Powered by <span className="text-bornebit-primary/70 font-semibold">Bornebit</span> & Spatial Systems
                        </p>
                    </div>
                </div>
              </ShineBorderCard>
            </motion.div>
        </div>
    );
};

export default Login;
