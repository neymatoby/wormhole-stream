import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import VideoPlayer from './components/VideoPlayer';
import Login from './components/Login';
import PricingPlans from './components/PricingPlans';
import DroneMap from './components/DroneMap';
import WeatherAdvisory from './components/WeatherAdvisory';
import StreamQRCode from './components/QRCode';
import { useAuth } from './contexts/AuthContext';
import { getSubscription, isSubscriptionActive } from './lib/supabase';
import { 
  LayoutDashboard, 
  Video, 
  Settings, 
  LogOut, 
  MapPin, 
  CloudSun,
  Wifi,
  Copy,
  Check,
  Zap,
  Globe,
  Compass,
  Sparkles,
  Activity,
  Shield,
  Radio,
  QrCode,
  Share2,
  Navigation,
  Crosshair,
  RotateCcw,
  Edit3
} from 'lucide-react';
import './App.css';

/* ═══════════════════════════════════════════════════════════════
   MagicUI-Inspired Animated Components
   ═══════════════════════════════════════════════════════════════ */

/** ShimmerBorder — a card with an animated rainbow/gradient border shimmer */
const ShimmerCard = ({ children, className = '', borderColor = 'from-bornebit-primary via-purple-500 to-blue-500' }) => (
  <div className={`relative group ${className}`}>
    {/* Animated shimmer border */}
    <div className={`absolute -inset-[1px] rounded-3xl bg-gradient-to-r ${borderColor} opacity-20 group-hover:opacity-50 blur-sm transition-opacity duration-700`} />
    <div className={`absolute -inset-[1px] rounded-3xl bg-gradient-to-r ${borderColor} opacity-15 group-hover:opacity-35 transition-opacity duration-700`}
      style={{ backgroundSize: '200% 200%', animation: 'shimmer-move 3s linear infinite' }} />
    {/* Card content */}
    <div className="relative bg-[#0a0a1a]/80 backdrop-blur-2xl rounded-3xl border border-white/[0.06] overflow-hidden">
      {children}
    </div>
  </div>
);

/** GlowOrb — subtle floating glowing orbs for background ambiance */
const GlowOrb = ({ color, size, top, left, delay = 0 }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, top, left, background: color, filter: `blur(${parseInt(size)/2}px)` }}
    animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
    transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
  />
);

/** Particles — floating dots for ambiance */
const Particles = () => {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    duration: Math.random() * 12 + 8,
    delay: Math.random() * 5,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
            background: p.id % 3 === 0 ? 'rgba(255,87,34,0.4)' : p.id % 3 === 1 ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.3)',
          }}
          animate={{ y: [0, -120, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
};

/** AnimatedNumber — MagicUI-style number counter */
const AnimatedNumber = ({ value, suffix = '' }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value);
    if (isNaN(end)) { setDisplay(value); return; }
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay((start + (end - start) * eased).toFixed(suffix === '°' ? 0 : 6));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{display}{suffix}</span>;
};

/** MagicUI: Dot Pattern Background */
const DotPattern = () => (
  <div className="absolute inset-0 pointer-events-none dot-pattern opacity-30" />
);

/** MagicUI: Spotlight effect on hover for sidebar */
const SidebarSpotlight = ({ activeTab }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <motion.div
      className="absolute w-40 h-40 rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,87,34,0.08) 0%, transparent 70%)',
        filter: 'blur(20px)',
      }}
      animate={{
        top: activeTab === 'dashboard' ? '20%' : activeTab === 'stream' ? '35%' : '50%',
        left: '20%',
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
    />
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */

const DEFAULT_LOC = { lat: 6.5244, lon: 3.3792 };

const GPS_PRESETS = [
  { name: 'Lagos Main', lat: 6.5244, lon: 3.3792, flag: '🇳🇬' },
  { name: 'Victoria Island', lat: 6.4281, lon: 3.4219, flag: '🏝️' },
  { name: 'Ikeja Airport', lat: 6.5774, lon: 3.3212, flag: '✈️' },
  { name: 'Port Harcourt', lat: 4.7719, lon: 7.0140, flag: '⛽' },
  { name: 'Abuja Central', lat: 9.0765, lon: 7.3986, flag: '🏛️' },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [location, setLocation] = useState(DEFAULT_LOC);
  const [inputLat, setInputLat] = useState(DEFAULT_LOC.lat.toString());
  const [inputLon, setInputLon] = useState(DEFAULT_LOC.lon.toString());
  const [flightPath, setFlightPath] = useState([{ lat: 6.5244, lon: 3.3792 }]);
  const [copied, setCopied] = useState(false);
  
  const { user, loading, signOut, signIn, isAuthenticated, isDemo } = useAuth();

  const updateGpsCoordinates = (latVal, lonVal) => {
    const latNum = parseFloat(latVal);
    const lonNum = parseFloat(lonVal);
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      const newPos = { lat: latNum, lon: lonNum };
      setLocation(newPos);
      setInputLat(latNum.toFixed(4));
      setInputLon(lonNum.toFixed(4));
      setFlightPath((prev) => [...prev.slice(-49), newPos]);
    }
  };

  const handleDeviceGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateGpsCoordinates(pos.coords.latitude, pos.coords.longitude),
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
    }
  };

  // Track browser/device location on load
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateGpsCoordinates(pos.coords.latitude, pos.coords.longitude),
        (err) => console.warn('Geolocation error:', err)
      );
      const watcher = navigator.geolocation.watchPosition(
        (pos) => updateGpsCoordinates(pos.coords.latitude, pos.coords.longitude),
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    }
  }, []);

  // Check subscription
  useEffect(() => {
    const checkSub = async () => {
      if (!user) { setSubLoading(false); return; }
      if (isDemo) { setSubLoading(false); return; }
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
  }, [user, isDemo]);

  // Stream state
  const playerOptions = {
    autoplay: false,
    controls: true,
    responsive: true,
    fluid: true,
    poster: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=2670&auto=format&fit=crop",
  };
  const BUILD_TUNNEL_URL = import.meta.env.VITE_TUNNEL_URL || 'http://localhost:8080';
  
  // Read URL query params OR active tunnel domain immediately on component state initialization
  const [hlsServer, setHlsServer] = useState(() => {
    // 1. URL query param from scanned QR code
    const params = new URLSearchParams(window.location.search);
    const tunnelFromUrl = params.get('tunnel');
    if (tunnelFromUrl) {
      localStorage.setItem('borbnebit_hls_server', tunnelFromUrl);
      return tunnelFromUrl;
    }

    // 2. Active Cloudflare / ngrok origin if opened on tunnel directly
    const origin = window.location.origin;
    if (origin.includes('trycloudflare.com') || origin.includes('ngrok')) {
      localStorage.setItem('borbnebit_hls_server', origin);
      return origin;
    }

    // 3. Saved localStorage value
    const saved = localStorage.getItem('borbnebit_hls_server');
    if (saved) return saved;

    return BUILD_TUNNEL_URL;
  });

  const [streamKey, setStreamKey] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const keyFromUrl = params.get('key');
    if (keyFromUrl) {
      localStorage.setItem('borbnebit_stream_key', keyFromUrl);
      return keyFromUrl;
    }
    return localStorage.getItem('borbnebit_stream_key') || 'test';
  });

  const getStreamUrl = (server, key) => {
    let base = server.trim();
    if (base.endsWith('.m3u8')) return base;
    if (base.endsWith('/')) base = base.slice(0, -1);
    return `${base}/hls/${key}.m3u8`;
  };
  const streamUrl = getStreamUrl(hlsServer, streamKey);

  // Public tunnel URL — auto-detects from active origin if running on a tunnel
  const [publicTunnelUrl, setPublicTunnelUrl] = useState(() => {
    const origin = window.location.origin;
    if (origin.includes('trycloudflare.com') || origin.includes('ngrok')) {
      return origin;
    }
    const saved = localStorage.getItem('wormhole_public_tunnel_url');
    if (saved) return saved;
    if (hlsServer && hlsServer.includes('.trycloudflare.com')) {
      return hlsServer;
    }
    if (BUILD_TUNNEL_URL && BUILD_TUNNEL_URL !== 'http://localhost:8080' && !BUILD_TUNNEL_URL.includes('localhost')) {
      return BUILD_TUNNEL_URL;
    }
    return 'https://wed-encoding-sand-crystal.trycloudflare.com';
  });

  // Base web app URL for QR code — uses publicTunnelUrl if available, or current origin with LAN IP for mobile access
  const currentOrigin = window.location.origin;
  const hostName = window.location.hostname;
  const lanHost = (hostName === 'localhost' || hostName === '127.0.0.1') ? '192.168.10.93' : hostName;
  const portSuffix = window.location.port ? `:${window.location.port}` : '';
  const lanAppUrl = `${window.location.protocol}//${lanHost}${portSuffix}`;

  const baseAppUrl = publicTunnelUrl || lanAppUrl;

  const viewerHlsServer = publicTunnelUrl || (hlsServer.includes('localhost') || hlsServer.includes('127.0.0.1')
    ? hlsServer.replace(/localhost|127\.0\.0\.1/, '192.168.10.93')
    : hlsServer);

  const qrCodeUrl = `${baseAppUrl.endsWith('/') ? baseAppUrl : baseAppUrl + '/'}?tunnel=${encodeURIComponent(viewerHlsServer)}&key=${encodeURIComponent(streamKey)}`;

  const handlePublicUrlChange = (val) => {
    setPublicTunnelUrl(val);
    localStorage.setItem('wormhole_public_tunnel_url', val);
  };

  // ── Auto-fetch active Cloudflare tunnel URL from tunnel.json ─────────────────
  useEffect(() => {
    fetch('/tunnel.json?t=' + Date.now())
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.url && data.url.includes('.trycloudflare.com')) {
          setPublicTunnelUrl(data.url);
          setHlsServer((prev) => (prev.includes('localhost') ? data.url : prev));
          localStorage.setItem('wormhole_public_tunnel_url', data.url);
        }
      })
      .catch(() => {});
  }, []);

  // ── Auto-configure from URL query params or origin (for QR code viewers) ──────
  // When someone scans the QR code, the URL contains ?tunnel=...&key=...
  // We auto-login as demo, set the stream source, and jump to live view
  const qrParamsRef = useRef(() => {
    const params = new URLSearchParams(window.location.search);
    let tunnel = params.get('tunnel');
    let key = params.get('key');

    // Auto-detect if currently opened on a Cloudflare or ngrok tunnel URL directly
    const origin = window.location.origin;
    if (!tunnel && (origin.includes('trycloudflare.com') || origin.includes('ngrok'))) {
      tunnel = origin;
    }

    if (params.get('tunnel')) {
      // Clean the URL query params so they don't persist on manual refresh
      window.history.replaceState({}, '', window.location.pathname);
    }
    return { tunnel, key };
  });
  const [qrParams] = useState(() => qrParamsRef.current());

  useEffect(() => {
    if (qrParams.tunnel) {
      // Set the HLS server to the tunnel URL
      setHlsServer(qrParams.tunnel);
      localStorage.setItem('borbnebit_hls_server', qrParams.tunnel);

      if (qrParams.key) {
        setStreamKey(qrParams.key);
        localStorage.setItem('borbnebit_stream_key', qrParams.key);
      }

      // Jump to live stream tab
      setActiveTab('stream');
    }

    // Auto-login as demo if not already authenticated
    if (!loading && !isAuthenticated && (qrParams.tunnel || window.location.search.includes('tunnel'))) {
      signIn('demo@bornebit.com', 'demo123').catch(() => {});
    }
  }, [loading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleServerChange = (val) => { setHlsServer(val); localStorage.setItem('borbnebit_hls_server', val); };
  const handleKeyChange = (val) => { setStreamKey(val); localStorage.setItem('borbnebit_stream_key', val); };
  const handlePlanSelected = (plan) => { setSubscription({ plan_id: plan.id, status: 'active', expires_at: '2099-12-31' }); };

  const handleCopy = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auth/Load screens
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014]">
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-16 h-16 border-[2px] border-bornebit-primary/20 border-t-bornebit-primary rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-[2px] border-transparent border-b-bornebit-accent/40 rounded-full" style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-6 text-xs font-[family-name:'JetBrains_Mono',monospace] text-bornebit-primary/60 tracking-[0.3em]"
        >
          LOADING
        </motion.p>
      </div>
    );
  }
  if (!isAuthenticated) return <Login />;
  if (subLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014] text-white gap-5">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bornebit-primary/20 to-bornebit-accent/10 border border-bornebit-primary/30 flex items-center justify-center">
            <Zap className="text-bornebit-primary" size={24} />
          </div>
        </motion.div>
        <p className="font-[family-name:'JetBrains_Mono',monospace] text-[11px] tracking-[0.3em] text-bornebit-primary/60">VERIFYING ACCESS</p>
      </div>
    );
  }
  if (!isSubscriptionActive(subscription) && !isDemo) {
    return <PricingPlans onPlanSelected={handlePlanSelected} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, shortLabel: 'Dash' },
    { id: 'stream', label: 'Live Stream', icon: <Video size={18} />, shortLabel: 'Live' },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} />, shortLabel: 'Config' },
  ];

  const pageVariants = {
    initial: { opacity: 0, y: 24, filter: 'blur(8px)' },
    in:      { opacity: 1, y: 0,  filter: 'blur(0px)' },
    out:     { opacity: 0, y: -24, filter: 'blur(8px)' }
  };
  const pageTransition = { type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.45 };

  const renderContent = () => {
    const locationTelemetry = {
      latitude: location.lat, longitude: location.lon,
      altitude: 0, altitudeFt: 0, speed: 0, speedKnots: 0,
      heading: 0, vSpeed: 0, distFromHome: 0,
      battery: 100, signal: -45, satellites: 12,
      droneModel: 'Computer Location'
    };

    switch (activeTab) {
      case 'dashboard':
        return (
          <motion.div 
            key="dashboard" variants={pageVariants}
            initial="initial" animate="in" exit="out" transition={pageTransition}
            className="w-full h-full flex flex-col xl:flex-row gap-6 p-4 md:p-6"
          >
            {/* Map Card */}
            <ShimmerCard className="flex-1" borderColor="from-emerald-500 via-bornebit-primary to-amber-500">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-bornebit-primary/20 border border-emerald-500/30 flex items-center justify-center">
                    <MapPin className="text-emerald-400" size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Location Tracker</h2>
                    <p className="text-[10px] text-gray-500 font-[family-name:'JetBrains_Mono',monospace] tracking-wider">REAL-TIME STREAMING SOURCE</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    <span className="text-[9px] font-bold text-emerald-400 tracking-[0.15em] font-[family-name:'JetBrains_Mono',monospace]">TRACKING</span>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden min-h-[400px] border border-white/5">
                  <DroneMap telemetry={locationTelemetry} flightPath={flightPath} />
                </div>
                {/* Location stats bar */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { icon: <Compass size={14} />, label: 'LAT', value: <AnimatedNumber value={location.lat} /> },
                    { icon: <Globe size={14} />, label: 'LON', value: <AnimatedNumber value={location.lon} /> },
                    { icon: <Activity size={14} />, label: 'STATUS', value: 'LIVE' },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/[0.05] transition-colors duration-300"
                    >
                      <div className="text-bornebit-primary/70">{stat.icon}</div>
                      <div>
                        <div className="text-[8px] uppercase text-gray-600 font-bold tracking-[0.2em] font-[family-name:'JetBrains_Mono',monospace]">{stat.label}</div>
                        <div className="text-sm font-[family-name:'JetBrains_Mono',monospace] text-white">{stat.value}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* GPS Data Update Control Panel */}
                <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation size={14} className="text-emerald-400" />
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider font-[family-name:'JetBrains_Mono',monospace]">
                        GPS Location Presets & Telemetry Override
                      </span>
                    </div>
                    <button
                      onClick={handleDeviceGps}
                      className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-lg text-[10px] font-bold text-emerald-400 transition-all font-[family-name:'JetBrains_Mono',monospace]"
                    >
                      <Crosshair size={12} />
                      DETECT MY GPS
                    </button>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-2">
                    {GPS_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => updateGpsCoordinates(preset.lat, preset.lon)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 font-[family-name:'JetBrains_Mono',monospace] ${
                          Math.abs(location.lat - preset.lat) < 0.01 && Math.abs(location.lon - preset.lon) < 0.01
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{preset.flag}</span>
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Manual Coordinates Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateGpsCoordinates(inputLat, inputLon);
                    }}
                    className="flex flex-wrap md:flex-nowrap items-center gap-2 pt-1"
                  >
                    <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2">
                      <span className="text-[10px] font-bold text-gray-500 font-[family-name:'JetBrains_Mono',monospace]">LAT:</span>
                      <input
                        type="number"
                        step="any"
                        value={inputLat}
                        onChange={(e) => setInputLat(e.target.value)}
                        placeholder="e.g. 6.5244"
                        className="w-full bg-transparent text-xs text-white font-[family-name:'JetBrains_Mono',monospace] focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2">
                      <span className="text-[10px] font-bold text-gray-500 font-[family-name:'JetBrains_Mono',monospace]">LON:</span>
                      <input
                        type="number"
                        step="any"
                        value={inputLon}
                        onChange={(e) => setInputLon(e.target.value)}
                        placeholder="e.g. 3.3792"
                        className="w-full bg-transparent text-xs text-white font-[family-name:'JetBrains_Mono',monospace] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all font-[family-name:'JetBrains_Mono',monospace] flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Edit3 size={12} />
                      UPDATE MAP
                    </button>
                  </form>
                </div>
              </div>
            </ShimmerCard>
            
            {/* Weather Card */}
            <ShimmerCard className="xl:w-[440px]" borderColor="from-blue-500 via-cyan-400 to-purple-500">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                    <CloudSun className="text-blue-400" size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Weather Intel</h2>
                    <p className="text-[10px] text-gray-500 font-[family-name:'JetBrains_Mono',monospace] tracking-wider">FLIGHT SAFETY & CONDITIONS</p>
                  </div>
                </div>
                <div className="flex-1">
                  <WeatherAdvisory latitude={location.lat} longitude={location.lon} />
                </div>
              </div>
            </ShimmerCard>
          </motion.div>
        );

      case 'stream':
        return (
          <motion.div 
            key="stream" variants={pageVariants}
            initial="initial" animate="in" exit="out" transition={pageTransition}
            className="w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6"
          >
            <ShimmerCard borderColor="from-red-500 via-bornebit-primary to-amber-500">
              <div className="relative">
                <div className="aspect-video w-full">
                  <VideoPlayer key={streamUrl} src={streamUrl} options={playerOptions} />
                </div>
                {/* Floating HUD badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-red-500/30 flex items-center gap-2.5"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-white tracking-[0.2em] font-[family-name:'JetBrains_Mono',monospace]">LIVE</span>
                  </motion.div>
                </div>
                <div className="absolute top-4 right-4 pointer-events-none">
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2"
                  >
                    <Radio size={10} className="text-green-400" />
                    <span className="text-[9px] font-[family-name:'JetBrains_Mono',monospace] text-green-400 font-bold tracking-[0.1em]">CONNECTED</span>
                  </motion.div>
                </div>
              </div>
            </ShimmerCard>
          </motion.div>
        );

      case 'settings':
        return (
          <motion.div 
            key="settings" variants={pageVariants}
            initial="initial" animate="in" exit="out" transition={pageTransition}
            className="w-full max-w-3xl mx-auto p-4 md:p-6 space-y-6"
          >
            {/* Stream Configuration Card */}
            <ShimmerCard borderColor="from-bornebit-primary via-amber-500 to-bornebit-primary">
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bornebit-primary/20 to-amber-500/20 border border-bornebit-primary/30 flex items-center justify-center">
                    <Zap className="text-bornebit-primary" size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Stream Configuration</h2>
                    <p className="text-gray-500 text-xs font-[family-name:'JetBrains_Mono',monospace] tracking-wider">MANAGE HLS SERVER & STREAM KEY</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase tracking-[0.2em] font-[family-name:'JetBrains_Mono',monospace]">HLS Server URL</label>
                    <input
                      type="text"
                      value={hlsServer}
                      onChange={(e) => handleServerChange(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-bornebit-primary/50 focus:ring-2 focus:ring-bornebit-primary/15 focus:bg-white/[0.05] transition-all duration-300 font-[family-name:'JetBrains_Mono',monospace] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase tracking-[0.2em] font-[family-name:'JetBrains_Mono',monospace]">Stream Key</label>
                    <input
                      type="text"
                      value={streamKey}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-bornebit-primary/50 focus:ring-2 focus:ring-bornebit-primary/15 focus:bg-white/[0.05] transition-all duration-300 font-[family-name:'JetBrains_Mono',monospace] text-sm"
                    />
                  </div>
                  <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] uppercase text-gray-600 font-bold tracking-[0.2em] mb-1.5 font-[family-name:'JetBrains_Mono',monospace]">Active Stream URL</div>
                      <div className="text-xs font-[family-name:'JetBrains_Mono',monospace] text-bornebit-primary/80 truncate">{streamUrl}</div>
                    </div>
                    <motion.button 
                      onClick={handleCopy}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 bg-bornebit-primary/10 hover:bg-bornebit-primary/20 border border-bornebit-primary/20 text-bornebit-primary px-4 py-2.5 rounded-xl transition-all text-xs font-bold shrink-0"
                    >
                      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </motion.button>
                  </div>
                </div>
              </div>
            </ShimmerCard>

            {/* Share Stream QR Code Card */}
            <ShimmerCard borderColor="from-cyan-500 via-blue-500 to-purple-500">
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <QrCode className="text-cyan-400" size={18} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Share Stream</h2>
                    <p className="text-gray-500 text-xs font-[family-name:'JetBrains_Mono',monospace] tracking-wider">SCAN TO WATCH LIVE</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full">
                    <Share2 size={10} className="text-cyan-400" />
                    <span className="text-[9px] font-bold text-cyan-400 tracking-[0.15em] font-[family-name:'JetBrains_Mono',monospace]">PUBLIC</span>
                  </div>
                </div>

                {/* Public Tunnel URL Input */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-2 uppercase tracking-[0.2em] font-[family-name:'JetBrains_Mono',monospace]">Public Tunnel URL</label>
                  <input
                    type="text"
                    value={publicTunnelUrl}
                    onChange={(e) => handlePublicUrlChange(e.target.value)}
                    placeholder="https://xxx.trycloudflare.com"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/15 focus:bg-white/[0.05] transition-all duration-300 font-[family-name:'JetBrains_Mono',monospace] text-sm placeholder:text-gray-700"
                  />
                  <p className="text-[9px] text-gray-600 mt-2 font-[family-name:'JetBrains_Mono',monospace]">
                    Paste the Cloudflare tunnel URL from <span className="text-cyan-400/70">deploy-demo.bat</span> output
                  </p>
                </div>

                {qrCodeUrl ? (
                  <StreamQRCode url={qrCodeUrl} label="Scan to Watch on Wormhole App" />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/[0.06] flex items-center justify-center">
                      <QrCode className="text-gray-600" size={24} />
                    </div>
                    <p className="text-[11px] text-gray-600 font-[family-name:'JetBrains_Mono',monospace] font-bold">NO PUBLIC URL SET</p>
                    <p className="text-[9px] text-gray-700 font-[family-name:'JetBrains_Mono',monospace] text-center max-w-[260px] leading-relaxed">
                      Enter your Cloudflare tunnel URL above to generate a QR code that viewers can scan.
                    </p>
                  </div>
                )}

                <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-[9px] text-gray-600 font-[family-name:'JetBrains_Mono',monospace] leading-relaxed">
                    <span className="text-cyan-400/70 font-bold">💡 TIP:</span> Run <span className="text-cyan-400/60">deploy-demo.bat</span> to start a Cloudflare tunnel. Copy the <span className="text-cyan-400/60">trycloudflare.com</span> URL and paste it above. The QR code updates instantly — viewers scan it to watch your live stream on any device.
                  </p>
                </div>
              </div>
            </ShimmerCard>

            {/* Account Card */}
            <ShimmerCard borderColor="from-purple-500 via-pink-500 to-bornebit-primary">
              <div className="p-8">
                <div className="flex flex-col items-center text-center">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-bornebit-primary to-bornebit-accent flex items-center justify-center text-2xl font-black text-white mb-5 shadow-xl shadow-bornebit-primary/30 relative overflow-hidden"
                  >
                    {/* Shine sweep on avatar */}
                    <div className="absolute inset-0" style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
                      animation: 'shine-sweep 4s ease-in-out infinite',
                    }} />
                    <span className="relative z-10">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
                  </motion.div>
                  <h3 className="text-lg font-bold text-white">{user?.user_metadata?.username || user?.email?.split('@')[0]}</h3>
                  <p className="text-sm text-gray-500 mt-1 font-[family-name:'JetBrains_Mono',monospace]">{user?.email}</p>
                  <div className="mt-3 inline-flex items-center gap-2 bg-bornebit-primary/10 border border-bornebit-primary/20 px-4 py-1.5 rounded-full">
                    <Sparkles size={12} className="text-bornebit-primary" />
                    <span className="text-[10px] font-bold text-bornebit-primary tracking-[0.15em] font-[family-name:'JetBrains_Mono',monospace]">{isDemo ? 'PRO VERSION' : (subscription?.plan_id || 'STARTER').toUpperCase()}</span>
                  </div>
                  
                  <motion.button 
                    onClick={signOut}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-8 flex items-center gap-2 px-8 py-3 rounded-2xl border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 font-bold transition-all duration-300 text-sm"
                  >
                    <LogOut size={16} /> Sign Out
                  </motion.button>
                </div>
              </div>
            </ShimmerCard>
          </motion.div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#030014] text-white overflow-hidden font-sans relative selection:bg-bornebit-primary/30">
      {/* Animated Background */}
      <Particles />
      <GlowOrb color="rgba(255,87,34,0.06)" size="600px" top="-200px" left="10%" delay={0} />
      <GlowOrb color="rgba(59,130,246,0.04)" size="500px" top="60%" left="70%" delay={3} />
      <GlowOrb color="rgba(139,92,246,0.035)" size="400px" top="80%" left="20%" delay={6} />

      {/* Glass Sidebar */}
      <aside className="relative z-20 w-20 md:w-72 h-full flex-shrink-0 flex flex-col items-center md:items-stretch py-6 md:py-8 px-2 md:px-5 border-r border-white/[0.04] bg-[#060616]/80 backdrop-blur-3xl">
        <SidebarSpotlight activeTab={activeTab} />
        
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10 md:px-2 shrink-0 justify-center md:justify-start relative z-10">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-bornebit-primary to-bornebit-accent shadow-lg shadow-bornebit-primary/30 flex items-center justify-center text-white font-black text-xl relative overflow-hidden"
          >
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
              animation: 'shine-sweep 3s ease-in-out infinite',
            }} />
            <span className="relative z-10">W</span>
          </motion.div>
          <div className="hidden md:block">
            <span className="text-lg font-black tracking-tight text-white">WORMHOLE</span>
            <span className="block text-[8px] text-gray-600 font-[family-name:'JetBrains_Mono',monospace] tracking-[0.2em] -mt-0.5">STREAM PLATFORM</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1.5 relative z-10">
          {navItems.map(item => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center justify-center md:justify-start gap-4 p-3.5 md:p-4 rounded-2xl transition-colors duration-300 relative
                ${activeTab === item.id ? 'text-white' : 'text-gray-600 hover:text-gray-300'}
              `}
            >
              <div className={`relative z-10 transition-all duration-300 ${activeTab === item.id ? 'text-bornebit-primary' : ''}`}>
                {item.icon}
              </div>
              <span className="hidden md:block font-semibold text-sm tracking-wide z-10 relative">
                {item.label}
              </span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="active-tab-bg"
                  className="absolute inset-0 bg-gradient-to-r from-bornebit-primary/[0.12] to-transparent border border-bornebit-primary/15 rounded-2xl"
                  style={{ boxShadow: '0 0 30px rgba(255,87,34,0.08), inset 0 1px 0 rgba(255,255,255,0.03)' }}
                  initial={false}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        {/* Status */}
        <div className="mt-auto flex flex-col items-center md:items-stretch md:px-1 gap-3 relative z-10">
          <div className="flex items-center gap-3 justify-center md:justify-start bg-white/[0.02] border border-white/[0.04] rounded-2xl p-3.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-40" />
            </div>
            <span className="hidden md:block font-[family-name:'JetBrains_Mono',monospace] text-[10px] text-emerald-400/80 font-bold tracking-[0.15em]">SYSTEM ONLINE</span>
          </div>
          <div className="hidden md:flex items-center gap-2 justify-center text-[9px] text-gray-700 font-[family-name:'JetBrains_Mono',monospace]">
            <span>v2.0.0</span>
            <span>•</span>
            <span>Wormhole™</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
