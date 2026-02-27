import { useState, useEffect } from 'react'
import VideoPlayer from './components/VideoPlayer'
import { Globe } from './components/Globe'
import Login from './components/Login'
import PricingPlans from './components/PricingPlans'
import DroneRadar from './components/DroneRadar'
import IndustryDashboard from './components/IndustryDashboard'
import { useAuth } from './contexts/AuthContext'
import { getSubscription, isSubscriptionActive } from './lib/supabase'
import './App.css'

// Industry config for theming
const INDUSTRY_CONFIG = {
  consultation: { icon: '🏢', name: 'Consultation', color: 'text-blue-400' },
  oil_gas: { icon: '🛢️', name: 'Oil & Gas', color: 'text-amber-400' },
  security: { icon: '🔒', name: 'Security', color: 'text-red-400' },
  agriculture: { icon: '🌾', name: 'Agriculture', color: 'text-green-400' },
  construction: { icon: '🏗️', name: 'Construction', color: 'text-violet-400' },
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const { user, loading, signOut, isAuthenticated } = useAuth();

  // Get org info
  const orgData = JSON.parse(localStorage.getItem('wormhole_org') || '{}');
  const userIndustry = orgData.industry || 'security';
  const industryConfig = INDUSTRY_CONFIG[userIndustry] || INDUSTRY_CONFIG.security;

  // Responsive detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check subscription status
  useEffect(() => {
    const checkSub = async () => {
      if (!user) {
        setSubLoading(false);
        return;
      }
      try {
        const sub = await getSubscription(user.id);
        setSubscription(sub);
      } catch (err) {
        console.warn('Subscription check:', err.message);
      } finally {
        setSubLoading(false);
      }
    };
    checkSub();
  }, [user]);

  const playerOptions = {
    autoplay: false,
    controls: true,
    responsive: true,
    fluid: true,
    poster: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=2670&auto=format&fit=crop",
  };

  const [streamKey, setStreamKey] = useState(() => localStorage.getItem('borbnebit_stream_key') || 'test');
  // Media server URL — ngrok tunnel to your local NGINX-RTMP Docker container
  const MEDIA_SERVER = 'https://wavelike-diana-pausefully.ngrok-free.dev';
  const defaultServer = MEDIA_SERVER;
  const [hlsServer, setHlsServer] = useState(() => localStorage.getItem('borbnebit_hls_server') || defaultServer);

  const getStreamUrl = (server, key) => {
    let base = server.trim();
    if (base.endsWith('.m3u8')) return base;
    if (base.endsWith('/')) base = base.slice(0, -1);
    return `${base}/hls/${key}.m3u8`;
  };

  const streamUrl = getStreamUrl(hlsServer, streamKey);

  const handleServerChange = (val) => {
    setHlsServer(val);
    localStorage.setItem('borbnebit_hls_server', val);
  };

  const handleKeyChange = (val) => {
    setStreamKey(val);
    localStorage.setItem('borbnebit_stream_key', val);
  };

  const copyVlcLink = () => {
    navigator.clipboard.writeText(streamUrl);
    alert(`Copied to clipboard!\n\nOpen VLC → Media → Open Network Stream → Paste:\n${streamUrl}`);
  };

  // Handle plan selection from pricing page
  const handlePlanSelected = (plan) => {
    setSubscription({ plan_id: plan.id, status: 'active', expires_at: '2099-12-31' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bornebit-gradient text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 border-4 border-bornebit-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-bornebit-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-bornebit-muted font-mono text-sm">INITIALIZING WORMHOLE...</p>
        </div>
      </div>
    );
  }

  // Not logged in → Login page
  if (!isAuthenticated) {
    return <Login />;
  }

  // Checking subscription
  if (subLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bornebit-gradient text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-bornebit-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-bornebit-muted text-sm">Checking access...</p>
        </div>
      </div>
    );
  }

  // No active subscription → Pricing page
  if (!isSubscriptionActive(subscription)) {
    return <PricingPlans onPlanSelected={handlePlanSelected} />;
  }

  // Determine plan tier for feature gating
  const planId = subscription?.plan_id || 'starter';
  const hasRadar = planId === 'professional' || planId === 'enterprise' || planId === 'monthly' || planId === 'annual';
  const hasHD = planId === 'professional' || planId === 'enterprise' || planId === 'monthly' || planId === 'annual';

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
    { id: 'stream', name: 'Live Feeds', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { id: 'radar', name: 'Airspace', icon: 'M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z' },
    { id: 'team', name: 'Team', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
    { id: 'settings', name: 'Settings', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z' },
  ];

  // Render active tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <IndustryDashboard />;

      case 'radar':
        return (
          <div className="max-w-4xl mx-auto">
            {hasRadar ? (
              <DroneRadar />
            ) : (
              <div className="bg-bornebit-surface rounded-2xl border border-white/10 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-bornebit-primary/10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-bornebit-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Upgrade to Access Airspace Radar</h3>
                <p className="text-bornebit-muted text-sm mb-4">Drone/Aircraft detection radar is available on Professional and Enterprise plans.</p>
                <button
                  onClick={() => setSubscription(null)}
                  className="bg-gradient-to-r from-bornebit-primary to-bornebit-accent text-white font-bold py-2.5 px-6 rounded-xl text-sm hover:opacity-90 transition-all"
                >
                  Upgrade Plan
                </button>
              </div>
            )}
          </div>
        );

      case 'team':
        return (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-bornebit-surface rounded-xl border border-white/10 p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-bornebit-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                Team Members
              </h3>
              <div className="mb-4 p-4 bg-black/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bornebit-primary to-bornebit-accent flex items-center justify-center text-sm font-bold">
                    {user?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{user?.user_metadata?.username || user?.email?.split('@')[0]}</div>
                    <div className="text-xs text-bornebit-muted">{user?.email}</div>
                  </div>
                  <span className="text-[10px] bg-bornebit-primary/20 text-bornebit-primary px-2 py-0.5 rounded-full font-bold">ADMIN</span>
                </div>
              </div>

              {/* Invite Team */}
              <div className="bg-gradient-to-r from-bornebit-primary/5 to-bornebit-accent/5 rounded-xl border border-bornebit-primary/20 p-4">
                <h4 className="text-sm font-semibold text-white mb-2">Invite Team Members</h4>
                <p className="text-xs text-gray-400 mb-3">
                  {planId === 'starter' ? 'Up to 3 members on Starter plan' : planId === 'professional' ? 'Up to 15 members on Professional plan' : 'Unlimited members on Enterprise plan'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-bornebit-primary focus:outline-none"
                  />
                  <button className="bg-bornebit-primary/20 hover:bg-bornebit-primary/30 border border-bornebit-primary/30 text-bornebit-primary text-sm px-4 py-2.5 rounded-xl transition-all font-semibold">
                    Invite
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-2">⚡ Team invites will be enabled once backend is deployed</p>
              </div>
            </div>

            {/* Organization Info */}
            <div className="bg-bornebit-surface rounded-xl border border-white/10 p-6">
              <h3 className="font-bold text-white mb-4">Organization</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-gray-400">Name</span>
                  <span className="text-sm font-mono text-white">{orgData.name || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-gray-400">Industry</span>
                  <span className="text-sm text-white">{industryConfig.icon} {industryConfig.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-gray-400">Plan</span>
                  <span className="text-sm font-bold text-bornebit-primary capitalize">{planId.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-400">Created</span>
                  <span className="text-sm font-mono text-gray-500">{orgData.created ? new Date(orgData.created).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-bornebit-surface rounded-lg border border-white/10 p-6">
              <h3 className="font-bold text-white mb-4">Stream Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-bornebit-muted uppercase tracking-wider block mb-2">HLS Server URL</label>
                  <input
                    type="text"
                    value={hlsServer}
                    onChange={(e) => handleServerChange(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-bornebit-primary focus:outline-none font-mono text-bornebit-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-bornebit-muted uppercase tracking-wider block mb-2">Stream Key</label>
                  <input
                    type="text"
                    value={streamKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-bornebit-primary focus:outline-none font-mono text-bornebit-primary"
                  />
                </div>
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-xs text-bornebit-muted mb-1">Stream URL:</div>
                  <div className="text-xs font-mono text-bornebit-primary break-all">{streamUrl}</div>
                </div>
                <button onClick={copyVlcLink} className="w-full bg-bornebit-primary/20 hover:bg-bornebit-primary/30 border border-bornebit-primary/30 text-bornebit-primary text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  📋 Copy VLC Link
                </button>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="bg-bornebit-surface rounded-lg border border-white/10 p-6">
              <h3 className="font-bold text-white mb-4">Subscription</h3>
              <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <div>
                  <div className="text-sm font-bold text-white capitalize">{planId.replace('_', ' ')} Plan</div>
                  <div className="text-xs text-bornebit-muted">Active • {subscription?.expires_at ? `Expires ${new Date(subscription.expires_at).toLocaleDateString()}` : 'No expiry'}</div>
                </div>
                <div className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full font-bold uppercase">Active</div>
              </div>
              <button
                onClick={() => setSubscription(null)}
                className="mt-3 w-full bg-white/5 border border-white/10 text-gray-400 text-sm py-2.5 rounded-xl hover:bg-white/10 transition-all"
              >
                Change Plan
              </button>
            </div>

            {/* Account */}
            <div className="bg-bornebit-surface rounded-lg border border-white/10 p-6">
              <h3 className="font-bold text-white mb-4">Account</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-bornebit-primary to-bornebit-accent flex items-center justify-center text-lg font-bold">
                  {user?.email?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{user?.user_metadata?.username || user?.email?.split('@')[0]}</div>
                  <div className="text-xs text-bornebit-muted">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-2.5 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        );

      default: // 'stream'
        return (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Player Container */}
            <div className="lg:col-span-2 space-y-4">
              <div className="aspect-video w-full bg-black rounded-lg md:rounded-xl overflow-hidden border border-white/10 shadow-2xl relative group">
                <VideoPlayer
                  key={streamUrl}
                  src={streamUrl}
                  options={playerOptions}
                  onReady={(player) => {
                    console.log("Wormhole Player Ready", player);
                    player.on('error', () => {
                      console.error("Video Player Error:", player.error());
                    });
                  }}
                />
                {/* HUD Overlay */}
                <div className="absolute top-2 md:top-4 left-2 md:left-4 flex flex-col gap-1 pointer-events-none">
                  <div className="text-[10px] md:text-xs font-mono text-bornebit-primary bg-black/60 px-2 py-0.5 rounded flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    LIVE
                  </div>
                  <div className="text-[10px] md:text-xs font-mono text-white bg-black/60 px-2 py-0.5 rounded">
                    {hasHD ? 'HD 1080p' : 'SD 480p'}
                  </div>
                  <div className="text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <span>{industryConfig.icon}</span>
                    <span className={industryConfig.color}>{industryConfig.name}</span>
                  </div>
                </div>
                <div className="absolute top-2 md:top-4 right-2 md:right-4 pointer-events-none">
                  <div className="text-[10px] md:text-xs font-mono text-green-400 bg-black/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                    CONNECTED
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bornebit-surface p-4 rounded-lg border border-white/10">
                  <h2 className="text-lg md:text-xl font-bold text-white mb-1">{orgData.name || 'Live Stream'}</h2>
                  <p className="text-xs text-bornebit-muted mb-3">{industryConfig.icon} {industryConfig.name} — Active drone deployment</p>
                  <div className="space-y-2 font-mono text-xs">
                    {[
                      { label: 'COORDINATES', value: '6.5244° N, 3.3792° E' },
                      { label: 'ALTITUDE', value: '1,250 FT' },
                      { label: 'VELOCITY', value: '45 KNOTS' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-bornebit-muted">{item.label}</span>
                        <span className="text-bornebit-accent">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compact Industry Dashboard or Radar or Globe */}
                {hasRadar ? (
                  <DroneRadar compact={true} />
                ) : !isMobile ? (
                  <IndustryDashboard compact={true} />
                ) : null}
              </div>
            </div>

            {/* Side Panel */}
            <div className="bg-bornebit-surface rounded-lg border border-white/10 p-4 flex flex-col gap-4">
              <h3 className="font-bold text-bornebit-primary border-b border-white/5 pb-2 uppercase tracking-wide text-sm">Live Telemetry</h3>
              <div className="space-y-4">
                {[
                  { label: 'Battery', value: '87%', color: 'bg-green-500', barWidth: '87%' },
                  { label: 'Signal', value: '-65 dBm', color: 'bg-green-500', barWidth: '75%' },
                  { label: 'Speed', value: '42 km/h', color: 'bg-bornebit-primary', barWidth: '60%' },
                  { label: 'Wind', value: '12 km/h NW', color: 'bg-yellow-500', barWidth: '30%' },
                ].map(stat => (
                  <div key={stat.label} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs md:text-sm">{stat.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{stat.value}</span>
                        <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                      </div>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.color} rounded-full transition-all duration-1000`} style={{ width: stat.barWidth }}></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* VLC Quick Access */}
              <div className="bg-gradient-to-br from-bornebit-primary/10 to-bornebit-accent/10 border border-bornebit-primary/20 rounded-lg p-3 mt-2">
                <div className="text-xs font-bold text-bornebit-primary uppercase tracking-wider mb-2">📡 Stream Link</div>
                <div className="font-mono text-[10px] text-bornebit-accent break-all mb-2">{streamUrl}</div>
                <button onClick={copyVlcLink} className="w-full bg-bornebit-primary/20 hover:bg-bornebit-primary/30 border border-bornebit-primary/30 text-bornebit-primary text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2">
                  📋 Copy for VLC
                </button>
              </div>

              {/* Plan Badge */}
              <div className="bg-black/40 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Plan</div>
                  <div className="text-sm font-bold text-white capitalize">{planId.replace('_', ' ')}</div>
                </div>
                <div className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold">ACTIVE</div>
              </div>

              {/* Org Badge */}
              {orgData.name && (
                <div className="bg-black/40 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-lg">{industryConfig.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{orgData.name}</div>
                    <div className="text-[10px] text-gray-500">{industryConfig.name}</div>
                  </div>
                </div>
              )}

              <div className="mt-auto bg-black/40 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Console</div>
                <div className="font-mono text-[10px] space-y-1 text-green-400 opacity-80 h-20 overflow-hidden">
                  <p>&gt; Connection established</p>
                  <p>&gt; Stream: {streamKey} @ {hasHD ? '1080p' : '480p'}</p>
                  <p>&gt; Industry: {industryConfig.name}</p>
                  <p>&gt; Telemetry: Synced</p>
                  <p className="animate-pulse">&gt; _</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-bornebit-gradient text-white overflow-hidden font-sans relative">
      {/* Globe Background - Desktop only */}
      {!isMobile && activeTab === 'stream' && <Globe isBackground={true} />}

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isMobile
          ? `fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'w-72 relative z-20'
        }
        bg-bornebit-surface border-r border-white/5 flex flex-col
      `}>
        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20">
          <div>
            <div className="font-extrabold text-2xl tracking-tighter text-bornebit-primary">WORMHOLE</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest -mt-0.5">Multi-Industry SaaS</div>
          </div>
          {isMobile && (
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-white/5 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bornebit-primary to-bornebit-accent flex items-center justify-center text-sm font-bold uppercase shadow-lg shadow-bornebit-primary/30">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.user_metadata?.username || user?.email?.split('@')[0] || 'Operator'}</div>
              <div className="text-[10px] text-bornebit-primary font-mono uppercase">{planId.replace('_', ' ')} Plan</div>
            </div>
          </div>
          {orgData.name && (
            <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg px-2 py-1.5">
              <span className="text-sm">{industryConfig.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-white truncate">{orgData.name}</div>
                <div className="text-[9px] text-gray-500">{industryConfig.name}</div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <a
              key={item.id}
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveTab(item.id); if (isMobile) setIsSidebarOpen(false); }}
              className={`flex items-center gap-4 p-3 rounded-lg transition-all ${activeTab === item.id
                ? 'bg-bornebit-primary text-white shadow-lg shadow-bornebit-primary/25'
                : 'hover:bg-white/5 text-gray-300'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="font-semibold text-sm">{item.name}</span>
              {item.id === 'radar' && !hasRadar && (
                <span className="ml-auto text-[9px] bg-bornebit-primary/20 text-bornebit-primary px-1.5 py-0.5 rounded">PRO</span>
              )}
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
            <div>
              <div className="text-xs text-green-500 font-mono">OPERATIONAL</div>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-lg py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 text-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-bornebit-bg">
        <header className="h-14 md:h-16 border-b border-white/5 bg-bornebit-surface/80 backdrop-blur flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/10 rounded-lg text-bornebit-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              </button>
            )}
            <h1 className="text-base md:text-xl font-bold uppercase tracking-wider text-white">
              {navItems.find(i => i.id === activeTab)?.name || 'Dashboard'}
            </h1>
            <span className="bg-bornebit-primary/20 text-bornebit-primary text-[10px] px-2 py-0.5 rounded border border-bornebit-primary/30 uppercase font-mono">{planId.replace('_', ' ')}</span>
            {orgData.name && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] bg-white/5 border border-white/10 rounded px-2 py-0.5 text-gray-500">
                {industryConfig.icon} {orgData.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isMobile && activeTab === 'stream' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-bornebit-muted">Server:</span>
                  <input type="text" value={hlsServer} onChange={(e) => handleServerChange(e.target.value)} className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs focus:border-bornebit-primary focus:outline-none w-48 font-mono text-bornebit-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-bornebit-muted">Key:</span>
                  <input type="text" value={streamKey} onChange={(e) => handleKeyChange(e.target.value)} className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs focus:border-bornebit-primary focus:outline-none w-20 font-mono text-bornebit-primary" />
                </div>
              </>
            )}
            <button onClick={copyVlcLink} className="p-2 hover:bg-white/10 rounded-lg text-bornebit-primary" title="Copy VLC Link">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.813a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" /></svg>
            </button>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-3 md:p-6 scroll-smooth ${isMobile ? 'pb-20' : ''}`}>
          {renderContent()}
        </div>

        {/* Mobile Bottom Nav */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 bg-bornebit-surface/95 backdrop-blur-lg border-t border-white/10 flex items-center justify-around py-2 px-2 z-30 safe-area-bottom">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${activeTab === item.id ? 'text-bornebit-primary' : 'text-gray-500'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={activeTab === item.id ? 2 : 1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-[10px] font-medium">{item.name}</span>
                {activeTab === item.id && <div className="w-1 h-1 rounded-full bg-bornebit-primary"></div>}
              </button>
            ))}
          </nav>
        )}
      </main>
    </div>
  )
}

export default App
