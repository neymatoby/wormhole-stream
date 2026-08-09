import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Zap, Shield, Sparkles, Check, Star, Rocket, Crown } from 'lucide-react';

/* ─── MagicUI: Border Beam ─── */
const BorderBeam = ({ color = '#FF5722', duration = 6 }) => (
  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
    <div
      className="absolute w-20 h-20 rounded-full"
      style={{
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        offsetPath: `rect(0 100% 100% 0 round 24px)`,
        animation: `border-beam ${duration}s linear infinite`,
        offsetRotate: '0deg',
        filter: `blur(6px)`,
        opacity: 0.7,
      }}
    />
  </div>
);

/* ─── MagicUI: Animated Background ─── */
const PricingBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Grid */}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,87,34,0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,87,34,0.4) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }}
    />
    {/* Gradient blobs */}
    <div className="absolute top-[-15%] right-[-5%] w-[600px] h-[600px] bg-bornebit-primary/[0.08] rounded-full blur-[150px]" />
    <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] bg-blue-600/[0.06] rounded-full blur-[120px]" />
    <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/[0.04] rounded-full blur-[100px]" />
  </div>
);

const PricingPlans = ({ onPlanSelected }) => {
    const { user } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [hoveredPlan, setHoveredPlan] = useState(null);

    const handleSelectPlan = (planId) => {
        setSelectedPlan(planId);
        setTimeout(() => {
            onPlanSelected({ id: planId });
        }, 1000);
    };

    const plans = [
      {
        id: 'free_trial',
        name: 'Starter',
        price: '$0',
        period: '/ 14 days',
        description: 'Perfect for evaluating the platform',
        icon: <Shield size={24} />,
        color: 'from-gray-400 to-gray-300',
        borderColor: 'border-white/10 hover:border-white/20',
        features: [
          'Full Map & Weather access',
          '1080p HD Streaming',
          'Follow computer location',
          'Basic analytics dashboard',
        ],
        buttonStyle: 'bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20',
        buttonText: 'Start Free Trial',
      },
      {
        id: 'pro_version',
        name: 'Professional',
        price: '$99',
        period: '/ month',
        description: 'For teams and commercial operations',
        icon: <Crown size={24} />,
        color: 'from-bornebit-primary to-bornebit-accent',
        borderColor: 'border-bornebit-primary/30',
        recommended: true,
        features: [
          'Everything in Starter',
          'Unlimited 4K Streaming',
          'Multi-device location tracking',
          '24/7 Priority Support',
          'Custom OBS integration',
          'API access & webhooks',
        ],
        buttonStyle: 'bg-gradient-to-r from-bornebit-primary to-bornebit-accent shadow-xl shadow-bornebit-primary/30',
        buttonText: 'Go Pro',
      }
    ];

    return (
        <div className="min-h-screen w-full bg-[#030014] relative overflow-hidden flex flex-col justify-center items-center p-6">
            <PricingBackground />

            {/* Header */}
            <div className="text-center mb-14 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 bg-bornebit-primary/10 border border-bornebit-primary/20 rounded-full px-4 py-1.5 mb-6"
                >
                    <Sparkles size={14} className="text-bornebit-primary" />
                    <span className="text-xs font-bold text-bornebit-primary tracking-wider font-[family-name:'JetBrains_Mono',monospace]">PRICING</span>
                </motion.div>
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-black text-white mb-5 tracking-tight"
                >
                    Choose Your{' '}
                    <span className="gradient-text-animated">Access</span>
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed"
                >
                    Start with our 14-day Free Trial or go Pro for unlimited streaming and advanced features.
                </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl relative z-10">
                {plans.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    onMouseEnter={() => setHoveredPlan(plan.id)}
                    onMouseLeave={() => setHoveredPlan(null)}
                    className={`relative group ${plan.recommended ? 'md:-mt-4 md:mb-[-16px]' : ''}`}
                  >
                    {/* Shimmer border for recommended */}
                    {plan.recommended && (
                      <>
                        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-bornebit-primary via-amber-500 to-bornebit-primary opacity-40 group-hover:opacity-70 transition-opacity duration-500"
                          style={{ backgroundSize: '200% 200%', animation: 'shimmer-move 3s linear infinite' }}
                        />
                        <BorderBeam color="#FF5722" duration={5} />
                      </>
                    )}

                    <div className={`relative h-full glass-morphism-strong rounded-3xl p-8 md:p-10 flex flex-col transition-all duration-500 ${
                      plan.recommended ? 'ring-1 ring-bornebit-primary/20' : `border ${plan.borderColor}`
                    } ${hoveredPlan === plan.id ? 'translate-y-[-4px]' : ''}`}>

                      {/* Recommended badge */}
                      {plan.recommended && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-bornebit-primary to-bornebit-accent text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-1.5 rounded-full shadow-xl shadow-bornebit-primary/40 flex items-center gap-1.5"
                        >
                          <Star size={10} className="fill-white" /> RECOMMENDED
                        </motion.div>
                      )}

                      {/* Icon + Name */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white shadow-lg ${
                          plan.recommended ? 'shadow-bornebit-primary/30' : 'shadow-white/5'
                        }`}>
                          {plan.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                          <p className="text-xs text-gray-500">{plan.description}</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-8">
                        <span className="text-5xl font-black text-white">{plan.price}</span>
                        <span className="text-base font-normal text-gray-500 ml-1">{plan.period}</span>
                      </div>

                      {/* Feature list */}
                      <ul className="space-y-4 mb-10 flex-1">
                        {plan.features.map((feature, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.05 }}
                            className="flex items-center gap-3 text-gray-300 text-sm"
                          >
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                              plan.recommended ? 'bg-bornebit-primary/20 text-bornebit-primary' : 'bg-white/5 text-gray-400'
                            }`}>
                              <Check size={12} strokeWidth={3} />
                            </div>
                            {feature}
                          </motion.li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <motion.button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={selectedPlan !== null}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full relative overflow-hidden py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${plan.buttonStyle}`}
                      >
                        {plan.recommended && (
                          <div className="absolute inset-0" style={{
                            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                            animation: 'shine-sweep 3s ease-in-out infinite',
                          }} />
                        )}
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {selectedPlan === plan.id ? (
                            <>
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                                <Sparkles size={16} />
                              </motion.div>
                              Initializing...
                            </>
                          ) : (
                            <>
                              {plan.recommended ? <Rocket size={16} /> : <Zap size={16} />}
                              {plan.buttonText}
                            </>
                          )}
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
            </div>

            {/* Bottom trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="relative z-10 mt-12 flex items-center gap-6 text-gray-600"
            >
              <div className="flex items-center gap-2">
                <Shield size={14} />
                <span className="text-[11px] font-[family-name:'JetBrains_Mono',monospace]">SSL Secured</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Zap size={14} />
                <span className="text-[11px] font-[family-name:'JetBrains_Mono',monospace]">Cancel Anytime</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Star size={14} />
                <span className="text-[11px] font-[family-name:'JetBrains_Mono',monospace]">99.9% Uptime</span>
              </div>
            </motion.div>
        </div>
    );
};

export default PricingPlans;
