import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * DroneRadar - Live aircraft/drone detection using OpenSky Network API
 * Shows nearby aircraft on a radar-like display using the user's GPS location
 */
const DroneRadar = ({ compact = false }) => {
    const [aircraft, setAircraft] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [radarRange, setRadarRange] = useState(50); // km
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const sweepAngleRef = useRef(0);

    // Get user's GPS location
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            setIsLoading(false);
            // Use default location (Lagos, Nigeria)
            setUserLocation({ lat: 6.5244, lon: 3.3792 });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude
                });
                setLocationError(null);
            },
            (err) => {
                console.warn('Geolocation error:', err.message);
                setLocationError('Location access denied - using default');
                // Default to Lagos
                setUserLocation({ lat: 6.5244, lon: 3.3792 });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    // Fetch aircraft data from OpenSky Network
    const fetchAircraft = useCallback(async () => {
        if (!userLocation) return;

        try {
            // Calculate bounding box (roughly radarRange km in each direction)
            const latDelta = radarRange / 111; // ~111 km per degree latitude
            const lonDelta = radarRange / (111 * Math.cos(userLocation.lat * Math.PI / 180));

            const bbox = {
                lamin: userLocation.lat - latDelta,
                lamax: userLocation.lat + latDelta,
                lomin: userLocation.lon - lonDelta,
                lomax: userLocation.lon + lonDelta,
            };

            const url = `https://opensky-network.org/api/states/all?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;

            const response = await fetch(url);

            if (!response.ok) {
                // OpenSky may rate limit - use cached data
                console.warn('OpenSky API rate limited, using cached data');
                return;
            }

            const data = await response.json();

            if (data.states) {
                const parsed = data.states.map((state) => ({
                    icao24: state[0],
                    callsign: state[1]?.trim() || 'UNKNOWN',
                    country: state[2],
                    lon: state[5],
                    lat: state[6],
                    altitude: state[7] || state[13], // baro or geo altitude
                    velocity: state[9], // m/s
                    heading: state[10],
                    verticalRate: state[11],
                    onGround: state[8],
                    category: state[17], // 0=No info, 1=No ADS-B, 2=Light, 3=Small, 4=Large, etc.
                })).filter(a => a.lat && a.lon);

                setAircraft(parsed);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.warn('Aircraft fetch error:', err.message);
            // Generate simulated data for demo
            generateDemoAircraft();
        } finally {
            setIsLoading(false);
        }
    }, [userLocation, radarRange]);

    // Generate demo aircraft when API is unavailable
    const generateDemoAircraft = () => {
        if (!userLocation) return;

        const demoAircraft = [];
        const count = 5 + Math.floor(Math.random() * 8);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radarRange / 111;
            demoAircraft.push({
                icao24: `demo_${i}`,
                callsign: ['DRN001', 'NGR204', 'ETH731', 'QTR852', 'AIR149', 'DRN003', 'SAF422', 'KEN108', 'BWA311', 'DRN007', 'UAE453', 'RAM201'][i % 12],
                country: 'Nigeria',
                lat: userLocation.lat + distance * Math.cos(angle),
                lon: userLocation.lon + distance * Math.sin(angle),
                altitude: Math.random() * 12000 + 500,
                velocity: Math.random() * 250 + 20,
                heading: Math.random() * 360,
                verticalRate: (Math.random() - 0.5) * 10,
                onGround: false,
                category: Math.random() > 0.7 ? 14 : Math.floor(Math.random() * 5), // Some as UAVs
            });
        }

        setAircraft(demoAircraft);
        setLastUpdated(new Date());
    };

    // Fetch on mount and every 15 seconds
    useEffect(() => {
        if (!userLocation) return;

        fetchAircraft();
        const interval = setInterval(fetchAircraft, 15000);
        return () => clearInterval(interval);
    }, [fetchAircraft, userLocation]);

    // Radar canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !userLocation) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const draw = () => {
            const rect = canvas.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            const cx = w / 2;
            const cy = h / 2;
            const radius = Math.min(cx, cy) - 10;

            ctx.clearRect(0, 0, w, h);

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, w, h);

            // Radar rings
            const ringCount = 4;
            for (let i = 1; i <= ringCount; i++) {
                const r = (radius / ringCount) * i;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 87, 34, 0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Distance labels
                const dist = Math.round((radarRange / ringCount) * i);
                ctx.fillStyle = 'rgba(255, 87, 34, 0.4)';
                ctx.font = `${compact ? 8 : 10}px monospace`;
                ctx.fillText(`${dist}km`, cx + r - 20, cy - 4);
            }

            // Cross lines
            ctx.beginPath();
            ctx.moveTo(cx - radius, cy);
            ctx.lineTo(cx + radius, cy);
            ctx.moveTo(cx, cy - radius);
            ctx.lineTo(cx, cy + radius);
            ctx.strokeStyle = 'rgba(255, 87, 34, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Cardinal directions
            ctx.fillStyle = 'rgba(255, 87, 34, 0.5)';
            ctx.font = `bold ${compact ? 9 : 11}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('N', cx, cy - radius + 12);
            ctx.fillText('S', cx, cy + radius - 4);
            ctx.fillText('E', cx + radius - 8, cy + 4);
            ctx.fillText('W', cx - radius + 8, cy + 4);

            // Sweep line
            sweepAngleRef.current += 0.015;
            if (sweepAngleRef.current > Math.PI * 2) sweepAngleRef.current = 0;

            const sweepAngle = sweepAngleRef.current - Math.PI / 2;

            // Sweep gradient
            const sweepGrad = ctx.createConicalGradient ? null : null;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, sweepAngle - 0.5, sweepAngle);
            ctx.closePath();
            const grad = ctx.createLinearGradient(
                cx, cy,
                cx + Math.cos(sweepAngle) * radius,
                cy + Math.sin(sweepAngle) * radius
            );
            grad.addColorStop(0, 'rgba(255, 87, 34, 0)');
            grad.addColorStop(1, 'rgba(255, 87, 34, 0.3)');
            ctx.fillStyle = grad;
            ctx.fill();

            // Sweep line
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(
                cx + Math.cos(sweepAngle) * radius,
                cy + Math.sin(sweepAngle) * radius
            );
            ctx.strokeStyle = 'rgba(255, 87, 34, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Center dot (user position)
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#FF5722';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 87, 34, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw aircraft blips
            aircraft.forEach((ac) => {
                if (!ac.lat || !ac.lon) return;

                const latDiff = ac.lat - userLocation.lat;
                const lonDiff = (ac.lon - userLocation.lon) * Math.cos(userLocation.lat * Math.PI / 180);
                const distKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111;

                if (distKm > radarRange) return;

                const scale = radius / radarRange;
                const x = cx + lonDiff * 111 * scale;
                const y = cy - latDiff * 111 * scale;

                // Determine if it's likely a drone (UAV category = 14, or low altitude + low speed)
                const isDrone = ac.category === 14 || (ac.altitude < 500 && ac.velocity < 50);
                const color = isDrone ? '#4CC9F0' : '#FF5722';
                const glowColor = isDrone ? 'rgba(76, 201, 240, 0.3)' : 'rgba(255, 87, 34, 0.3)';

                // Glow
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI * 2);
                ctx.fillStyle = glowColor;
                ctx.fill();

                // Blip
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                // Heading indicator
                if (ac.heading !== null && ac.heading !== undefined) {
                    const headingRad = (ac.heading * Math.PI / 180) - Math.PI / 2;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(
                        x + Math.cos(headingRad) * 12,
                        y + Math.sin(headingRad) * 12
                    );
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }

                // Callsign label
                if (!compact) {
                    ctx.fillStyle = color;
                    ctx.font = '9px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(ac.callsign, x + 10, y - 4);
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillText(
                        `${Math.round(ac.altitude || 0)}m`,
                        x + 10, y + 8
                    );
                }
            });

            animFrameRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [aircraft, userLocation, radarRange, compact]);

    // Classify aircraft
    const droneCount = aircraft.filter(ac => ac.category === 14 || (ac.altitude < 500 && ac.velocity < 50)).length;
    const aircraftCount = aircraft.length - droneCount;

    if (compact) {
        return (
            <div className="bg-bornebit-surface rounded-lg border border-white/10 overflow-hidden relative">
                <div className="absolute top-2 left-2 z-10 text-xs font-bold text-bornebit-muted uppercase tracking-widest">Radar</div>
                <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#4CC9F0]"></div>
                        <span className="text-[9px] text-gray-400 font-mono">{droneCount} UAV</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-bornebit-primary"></div>
                        <span className="text-[9px] text-gray-400 font-mono">{aircraftCount} AC</span>
                    </div>
                </div>
                <canvas ref={canvasRef} className="w-full aspect-square" />
            </div>
        );
    }

    return (
        <div className="bg-bornebit-surface rounded-lg border border-white/10 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-bornebit-primary uppercase tracking-wide text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    Airspace Radar
                </h3>
                <div className="flex items-center gap-2">
                    <select
                        value={radarRange}
                        onChange={(e) => setRadarRange(Number(e.target.value))}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-bornebit-primary focus:outline-none focus:border-bornebit-primary"
                    >
                        <option value={25}>25 km</option>
                        <option value={50}>50 km</option>
                        <option value={100}>100 km</option>
                        <option value={200}>200 km</option>
                    </select>
                    {lastUpdated && (
                        <span className="text-[10px] text-gray-500 font-mono">
                            {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Radar Canvas */}
            <div className="relative rounded-lg overflow-hidden border border-white/5">
                <canvas ref={canvasRef} className="w-full aspect-square" />

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-bornebit-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-bornebit-muted">Scanning airspace...</span>
                        </div>
                    </div>
                )}

                {locationError && (
                    <div className="absolute bottom-2 left-2 right-2 bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1">
                        <span className="text-[10px] text-yellow-400">{locationError}</span>
                    </div>
                )}
            </div>

            {/* Detection Summary */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/30 rounded-lg p-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#4CC9F0]/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#4CC9F0]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-white">{droneCount}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Drones/UAVs</div>
                    </div>
                </div>
                <div className="bg-black/30 rounded-lg p-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-bornebit-primary/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-bornebit-primary">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-white">{aircraftCount}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Aircraft</div>
                    </div>
                </div>
            </div>

            {/* Aircraft List */}
            {aircraft.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                    {aircraft.slice(0, 10).map((ac) => {
                        const isDrone = ac.category === 14 || (ac.altitude < 500 && ac.velocity < 50);
                        return (
                            <div key={ac.icao24} className="flex items-center justify-between bg-black/20 rounded px-2.5 py-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isDrone ? 'bg-[#4CC9F0]' : 'bg-bornebit-primary'}`}></div>
                                    <span className="font-mono font-bold text-white">{ac.callsign}</span>
                                    {isDrone && <span className="text-[9px] bg-[#4CC9F0]/20 text-[#4CC9F0] px-1.5 py-0.5 rounded">UAV</span>}
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 font-mono">
                                    <span>{Math.round(ac.altitude || 0)}m</span>
                                    <span>{Math.round((ac.velocity || 0) * 3.6)} km/h</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DroneRadar;
