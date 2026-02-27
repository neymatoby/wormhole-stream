import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { upsertSubscription } from '../lib/supabase';

const INDUSTRY_FEATURES = {
    consultation: {
        icon: '🏢',
        name: 'Consultation',
        features: ['Client project site streams', 'Meeting recording & replay', 'Multi-client portal access', 'Project milestone tracking'],
    },
    oil_gas: {
        icon: '🛢️',
        name: 'Oil & Gas',
        features: ['Pipeline inspection streams', 'Facility thermal monitoring', 'Leak detection overlays', 'Compliance recording & archival'],
    },
    security: {
        icon: '🔒',
        name: 'Security',
        features: ['Perimeter surveillance feeds', 'Drone detection radar', 'Threat alert notifications', 'Encrypted stream channels'],
    },
    agriculture: {
        icon: '🌾',
        name: 'Agriculture',
        features: ['Crop monitoring flyovers', 'NDVI-ready feed support', 'Field boundary mapping', 'Seasonal progress tracking'],
    },
    construction: {
        icon: '🏗️',
        name: 'Construction',
        features: ['Site progress timelapse', 'Safety zone monitoring', 'Equipment tracking views', 'Stakeholder sharing links'],
    },
};

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: 0,
        priceKobo: 0,
        display: 'Free',
        period: 'forever',
        features: [
            '1 live drone stream',
            '480p streaming quality',
            'Basic telemetry dashboard',
            '7-day recording history',
            'Up to 3 team members',
            'Community support',
        ],
        badge: 'FREE FOREVER',
        tier: 'free',
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 25000, // ₦25,000/month
        priceKobo: 2500000,
        display: '₦25,000',
        period: '/month per seat',
        features: [
            'Up to 5 simultaneous streams',
            '1080p HD quality',
            'Full telemetry + analytics',
            'Airspace radar (100km range)',
            '30-day recording archive',
            'Up to 15 team members',
            'Industry-specific dashboards',
            'Priority email support',
        ],
        badge: 'MOST POPULAR',
        tier: 'primary',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        priceKobo: null,
        display: 'Custom',
        period: 'contact us',
        features: [
            'Unlimited streams & 4K quality',
            'Full radar (200km+)',
            'Unlimited recording & archive',
            'Custom API & webhook integration',
            'White-label & custom branding',
            'Dedicated account manager',
            '99.9% SLA guarantee',
            'Unlimited team members',
            'SSO & advanced security',
            'On-premise deployment option',
        ],
        badge: 'CUSTOM PRICING',
        tier: 'accent',
    },
];

const PricingPlans = ({ onPlanSelected }) => {
    const { user } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showIndustryFeatures, setShowIndustryFeatures] = useState(false);

    // Get user's industry from localStorage
    const orgData = JSON.parse(localStorage.getItem('wormhole_org') || '{}');
    const userIndustry = orgData.industry || 'security';
    const industryInfo = INDUSTRY_FEATURES[userIndustry];

    // Initialize Paystack inline payment
    const payWithPaystack = (plan) => {
        const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxx';

        const handler = window.PaystackPop?.setup({
            key: paystackKey,
            email: user?.email || 'customer@wormhole.app',
            amount: plan.priceKobo,
            currency: 'NGN',
            ref: `wh_${plan.id}_${Date.now()}`,
            metadata: {
                plan_id: plan.id,
                plan_name: plan.name,
                user_id: user?.id,
                industry: userIndustry,
                custom_fields: [
                    {
                        display_name: 'Plan',
                        variable_name: 'plan',
                        value: plan.name,
                    },
                    {
                        display_name: 'Industry',
                        variable_name: 'industry',
                        value: userIndustry,
                    }
                ]
            },
            callback: async (response) => {
                console.log('Paystack success:', response);
                try {
                    await upsertSubscription(user.id, plan.id, {
                        customerId: response.reference,
                        subscriptionId: response.trans || response.transaction,
                    });
                    onPlanSelected(plan);
                } catch (err) {
                    console.error('Subscription save error:', err);
                    onPlanSelected(plan);
                }
            },
            onClose: () => {
                console.log('Payment window closed');
                setIsProcessing(false);
                setSelectedPlan(null);
            },
        });

        if (handler) {
            handler.openIframe();
        } else {
            console.warn('Paystack not loaded, running in demo mode');
            handleDemoPayment(plan);
        }
    };

    const handleDemoPayment = async (plan) => {
        try {
            await upsertSubscription(user.id, plan.id, {
                customerId: `demo_cus_${Date.now()}`,
                subscriptionId: `demo_sub_${Date.now()}`,
            });
            onPlanSelected(plan);
        } catch (err) {
            console.error('Demo subscription error:', err);
            onPlanSelected(plan);
        }
    };

    const handleSelectPlan = async (plan) => {
        setSelectedPlan(plan.id);
        setIsProcessing(true);

        try {
            if (plan.id === 'starter') {
                await upsertSubscription(user.id, plan.id);
                onPlanSelected(plan);
            } else if (plan.id === 'enterprise') {
                // Open email link for custom pricing
                window.open(`mailto:hello@bornebit.com?subject=Wormhole Enterprise - ${industryInfo.name}&body=Hi, I'm interested in the Enterprise plan for ${industryInfo.name}. Organization: ${orgData.name || 'N/A'}`, '_blank');
                setIsProcessing(false);
                setSelectedPlan(null);
            } else {
                payWithPaystack(plan);
            }
        } catch (err) {
            console.error('Plan selection error:', err);
            alert('Failed to process. Please try again.');
            setIsProcessing(false);
            setSelectedPlan(null);
        }
    };

    return (
        <div className="min-h-screen w-full bg-bornebit-gradient relative overflow-hidden flex flex-col">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-bornebit-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-bornebit-accent/5 rounded-full blur-3xl" />
                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,87,34,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,87,34,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 py-4 md:py-6 px-4 md:px-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-bornebit-primary to-bornebit-accent rounded-xl flex items-center justify-center shadow-lg shadow-bornebit-primary/30">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xl font-extrabold text-bornebit-primary tracking-tight">WORMHOLE</span>
                            <span className="text-[10px] text-gray-500 block -mt-0.5">Multi-Industry SaaS</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {orgData.name && (
                            <span className="text-xs text-gray-400 hidden md:block bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                                {industryInfo?.icon} {orgData.name}
                            </span>
                        )}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bornebit-primary to-bornebit-accent flex items-center justify-center text-xs font-bold uppercase">
                            {user?.email?.charAt(0) || 'U'}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 relative z-10 px-4 md:px-8 pb-8 flex flex-col items-center justify-center">
                <div className="text-center mb-6 md:mb-10">
                    <div className="inline-flex items-center gap-2 bg-bornebit-primary/10 border border-bornebit-primary/30 rounded-full px-4 py-1.5 mb-4">
                        <div className="w-2 h-2 rounded-full bg-bornebit-primary animate-pulse"></div>
                        <span className="text-xs font-semibold text-bornebit-primary uppercase tracking-wider">Choose Your Plan</span>
                    </div>
                    <h1 className="text-2xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
                        Drone Streaming for Every Agency
                    </h1>
                    <p className="text-bornebit-muted text-sm md:text-base max-w-xl mx-auto">
                        {industryInfo?.icon} Built for <span className="text-bornebit-primary font-semibold">{industryInfo?.name}</span> teams.
                        Real-time aerial surveillance, telemetry, and analytics. Start free, scale when funded.
                    </p>
                </div>

                {/* Industry-Specific Feature Banner */}
                <button
                    onClick={() => setShowIndustryFeatures(!showIndustryFeatures)}
                    className="mb-6 bg-gradient-to-r from-bornebit-primary/10 to-bornebit-accent/10 border border-bornebit-primary/20 rounded-xl px-5 py-3 flex items-center gap-3 hover:border-bornebit-primary/40 transition-all max-w-lg w-full"
                >
                    <span className="text-2xl">{industryInfo?.icon}</span>
                    <div className="text-left flex-1">
                        <div className="text-sm font-bold text-white">{industryInfo?.name} Features Included</div>
                        <div className="text-xs text-gray-400">Click to see industry-specific capabilities</div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 text-bornebit-primary transition-transform ${showIndustryFeatures ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                {showIndustryFeatures && (
                    <div className="mb-6 bg-bornebit-surface border border-white/10 rounded-xl p-5 max-w-lg w-full animate-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {industryInfo?.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-bornebit-primary shrink-0">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                    {feature}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl">
                    {PLANS.map((plan) => {
                        const isPrimary = plan.tier === 'primary';
                        const isAccent = plan.tier === 'accent';

                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl p-5 md:p-8 flex flex-col transition-all duration-300 ${isPrimary
                                    ? 'bg-gradient-to-b from-bornebit-primary/20 to-bornebit-surface border-2 border-bornebit-primary shadow-2xl shadow-bornebit-primary/20 md:scale-105 md:-my-2'
                                    : isAccent
                                        ? 'bg-gradient-to-b from-bornebit-accent/10 to-bornebit-surface border border-bornebit-accent/30'
                                        : 'bg-bornebit-surface border border-white/10'
                                    } hover:border-bornebit-primary/50`}
                            >
                                {/* Badge */}
                                {plan.badge && (
                                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${isPrimary
                                        ? 'bg-bornebit-primary text-white shadow-lg shadow-bornebit-primary/40'
                                        : isAccent
                                            ? 'bg-gradient-to-r from-bornebit-accent to-yellow-500 text-black'
                                            : 'bg-white/10 text-gray-400'
                                        }`}>
                                        {plan.badge}
                                    </div>
                                )}

                                <h3 className="text-lg font-bold text-white mt-2 mb-1">{plan.name}</h3>

                                {/* Price */}
                                <div className="flex items-baseline gap-1 mb-2">
                                    {plan.price === 0 ? (
                                        <span className="text-3xl md:text-4xl font-extrabold text-white">Free</span>
                                    ) : plan.price === null ? (
                                        <span className="text-2xl md:text-3xl font-extrabold text-white">Custom</span>
                                    ) : (
                                        <>
                                            <span className="text-2xl md:text-3xl font-extrabold text-white">{plan.display}</span>
                                            <span className="text-sm text-bornebit-muted">{plan.period}</span>
                                        </>
                                    )}
                                </div>
                                <div className="mb-4"></div>

                                {/* Features */}
                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 mt-0.5 shrink-0 ${isPrimary ? 'text-bornebit-primary' : isAccent ? 'text-bornebit-accent' : 'text-gray-500'}`}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <button
                                    onClick={() => handleSelectPlan(plan)}
                                    disabled={isProcessing && selectedPlan === plan.id}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${isPrimary
                                        ? 'bg-gradient-to-r from-bornebit-primary to-bornebit-accent text-white shadow-lg shadow-bornebit-primary/30 hover:opacity-90'
                                        : isAccent
                                            ? 'bg-gradient-to-r from-bornebit-accent to-yellow-500 text-black shadow-lg shadow-bornebit-accent/30 hover:opacity-90'
                                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isProcessing && selectedPlan === plan.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : plan.price === 0 ? 'Start Free' : plan.price === null ? 'Contact Sales' : `Subscribe ${plan.display}`}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Trust indicators */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-bornebit-muted">
                    <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        SSL Encrypted
                    </div>
                    <div className="flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41C18.93 5.77 22 8.65 22 12c0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                        Powered by Paystack
                    </div>
                    <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                        Cards, Bank Transfer, USSD
                    </div>
                    <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Cancel anytime
                    </div>
                </div>

                {/* Industries served */}
                <div className="mt-6 bg-white/5 border border-white/10 rounded-xl px-6 py-4 max-w-lg text-center">
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Trusted across industries</p>
                    <div className="flex items-center justify-center gap-4 text-lg">
                        <span title="Consultation">🏢</span>
                        <span title="Oil & Gas">🛢️</span>
                        <span title="Security">🔒</span>
                        <span title="Agriculture">🌾</span>
                        <span title="Construction">🏗️</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPlans;
