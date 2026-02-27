import { useState } from 'react';

const INDUSTRY_DASHBOARDS = {
    consultation: {
        icon: '🏢',
        name: 'Consultation Hub',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        metrics: [
            { label: 'Active Projects', value: '—', icon: '📊' },
            { label: 'Client Streams', value: '—', icon: '🎥' },
            { label: 'Reports Generated', value: '—', icon: '📄' },
            { label: 'Team Members', value: '1', icon: '👥' },
        ],
        quickActions: [
            { label: 'New Site Inspection', desc: 'Start a drone flyover for client review' },
            { label: 'Share Stream Link', desc: 'Generate a secure stream link for clients' },
            { label: 'Export Report', desc: 'Download site assessment with annotated footage' },
        ],
    },
    oil_gas: {
        icon: '🛢️',
        name: 'Operations Center',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        metrics: [
            { label: 'Active Pipelines', value: '—', icon: '🔧' },
            { label: 'Facility Feeds', value: '—', icon: '🏭' },
            { label: 'Compliance Score', value: '—', icon: '✅' },
            { label: 'Alerts', value: '0', icon: '⚠️' },
        ],
        quickActions: [
            { label: 'Pipeline Inspection', desc: 'Launch drone for pipeline corridor survey' },
            { label: 'Thermal Scan', desc: 'Monitor for heat anomalies at facilities' },
            { label: 'HSE Report', desc: 'Generate Health, Safety & Environment report' },
        ],
    },
    security: {
        icon: '🔒',
        name: 'Security Command',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        metrics: [
            { label: 'Perimeter Status', value: 'CLEAR', icon: '🛡️' },
            { label: 'Active Feeds', value: '—', icon: '📹' },
            { label: 'Threats Detected', value: '0', icon: '🚨' },
            { label: 'Drones Tracked', value: '—', icon: '🔍' },
        ],
        quickActions: [
            { label: 'Perimeter Sweep', desc: 'Deploy drone for full perimeter scan' },
            { label: 'Threat Analysis', desc: 'Review radar detections and classify threats' },
            { label: 'Incident Report', desc: 'Document security event with footage' },
        ],
    },
    agriculture: {
        icon: '🌾',
        name: 'Farm Monitor',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        metrics: [
            { label: 'Fields Mapped', value: '—', icon: '🗺️' },
            { label: 'Crop Health', value: '—', icon: '🌱' },
            { label: 'Irrigation Zones', value: '—', icon: '💧' },
            { label: 'Seasonal Progress', value: '—', icon: '📈' },
        ],
        quickActions: [
            { label: 'Crop Survey', desc: 'Fly your fields for NDVI & health analysis' },
            { label: 'Irrigation Check', desc: 'Monitor water distribution across zones' },
            { label: 'Harvest Report', desc: 'Generate yield estimate from aerial data' },
        ],
    },
    construction: {
        icon: '🏗️',
        name: 'Site Manager',
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/20',
        metrics: [
            { label: 'Active Sites', value: '—', icon: '📍' },
            { label: 'Progress', value: '—', icon: '📐' },
            { label: 'Safety Score', value: '—', icon: '🦺' },
            { label: 'Workers on Site', value: '—', icon: '👷' },
        ],
        quickActions: [
            { label: 'Progress Flyover', desc: 'Capture today\'s construction progress' },
            { label: 'Safety Inspection', desc: 'Monitor safety zone compliance' },
            { label: 'Stakeholder Update', desc: 'Share progress stream with investors' },
        ],
    },
};

const IndustryDashboard = ({ compact = false }) => {
    const [activeAction, setActiveAction] = useState(null);

    const orgData = JSON.parse(localStorage.getItem('wormhole_org') || '{}');
    const userIndustry = orgData.industry || 'security';
    const dashboard = INDUSTRY_DASHBOARDS[userIndustry] || INDUSTRY_DASHBOARDS.security;

    if (compact) {
        return (
            <div className={`bg-bornebit-surface rounded-lg border ${dashboard.borderColor} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{dashboard.icon}</span>
                    <h3 className={`text-sm font-bold ${dashboard.color} uppercase tracking-wide`}>{dashboard.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {dashboard.metrics.map((m, i) => (
                        <div key={i} className="bg-black/30 rounded-lg p-2 text-center">
                            <div className="text-xs text-gray-500">{m.icon} {m.label}</div>
                            <div className="text-sm font-bold text-white font-mono">{m.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className={`${dashboard.bgColor} rounded-2xl border ${dashboard.borderColor} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{dashboard.icon}</span>
                    <div>
                        <h2 className="text-xl font-bold text-white">{dashboard.name}</h2>
                        <p className="text-xs text-gray-400">{orgData.name || 'Your Organization'} — {INDUSTRY_DASHBOARDS[userIndustry]?.name || 'Dashboard'}</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dashboard.metrics.map((m, i) => (
                        <div key={i} className="bg-black/30 backdrop-blur rounded-xl p-3 text-center border border-white/5">
                            <div className="text-lg mb-1">{m.icon}</div>
                            <div className="text-lg font-bold text-white font-mono">{m.value}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{m.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-bornebit-surface rounded-xl border border-white/10 p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-bornebit-primary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {dashboard.quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveAction(activeAction === i ? null : i)}
                            className={`text-left p-4 rounded-xl border transition-all ${activeAction === i
                                ? 'border-bornebit-primary bg-bornebit-primary/10'
                                : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30'
                                }`}
                        >
                            <div className="text-sm font-semibold text-white mb-1">{action.label}</div>
                            <div className="text-xs text-gray-500">{action.desc}</div>
                            {activeAction === i && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <span className="text-[10px] text-bornebit-primary font-mono uppercase">▶ Connect a drone stream to activate</span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Getting Started */}
            <div className="bg-gradient-to-r from-bornebit-primary/10 to-bornebit-accent/10 rounded-xl border border-bornebit-primary/20 p-6">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    🚀 Getting Started
                </h3>
                <div className="space-y-2">
                    {[
                        { step: 1, text: 'Set up your stream key in Settings', done: false },
                        { step: 2, text: 'Connect OBS/SRT encoder to your drone', done: false },
                        { step: 3, text: 'Start streaming and monitor in real-time', done: false },
                        { step: 4, text: 'Share secure stream links with your team', done: false },
                    ].map(item => (
                        <div key={item.step} className="flex items-center gap-3 text-sm">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${item.done
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-white/5 text-gray-500'
                                }`}>
                                {item.done ? '✓' : item.step}
                            </div>
                            <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-300'}>{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default IndustryDashboard;
