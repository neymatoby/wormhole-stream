import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * DroneTelemetryOSD — On-Screen Display Annotation Parser & Flight Parameter Estimator
 * 
 * Simulates reading OSD data that drones overlay on their video feeds.
 * In production this would parse real annotations from the RTMP/HLS stream metadata
 * or use MAVLink/DJI SDK telemetry. For now, it generates realistic telemetry
 * and provides flight-parameter estimation based on visual annotation patterns.
 */

// Realistic drone models with their flight envelopes
const DRONE_PROFILES = {
    'DJI Mavic 3': { maxAlt: 6000, maxSpeed: 75, cruiseSpeed: 46, maxWind: 43, batteryTime: 46, weight: 0.895 },
    'DJI Matrice 300': { maxAlt: 7000, maxSpeed: 82, maxWind: 54, cruiseSpeed: 50, batteryTime: 55, weight: 6.3 },
    'DJI Air 3': { maxAlt: 6000, maxSpeed: 75, maxWind: 38, cruiseSpeed: 42, batteryTime: 46, weight: 0.720 },
    'Autel EVO II': { maxAlt: 7000, maxSpeed: 72, maxWind: 38, cruiseSpeed: 44, batteryTime: 42, weight: 1.127 },
    'Custom Build': { maxAlt: 5000, maxSpeed: 60, maxWind: 35, cruiseSpeed: 35, batteryTime: 25, weight: 2.5 },
};

// Flight phase detection thresholds
const FLIGHT_PHASES = {
    GROUNDED: { maxSpeed: 1, maxAlt: 5, label: 'Grounded', color: '#9E9E9E', icon: '🔽' },
    TAKEOFF: { minVr: 1.5, maxAlt: 50, label: 'Taking Off', color: '#4CAF50', icon: '🚀' },
    CLIMBING: { minVr: 0.5, label: 'Climbing', color: '#2196F3', icon: '⬆️' },
    CRUISING: { maxVrAbs: 0.5, minSpeed: 5, label: 'Cruising', color: '#FF9100', icon: '✈️' },
    HOVERING: { maxSpeed: 2, maxVrAbs: 0.3, label: 'Hovering', color: '#9C27B0', icon: '⏸️' },
    DESCENDING: { maxVr: -0.5, label: 'Descending', color: '#FF5722', icon: '⬇️' },
    LANDING: { maxVr: -0.3, maxAlt: 15, label: 'Landing', color: '#F44336', icon: '🔻' },
};

const DroneTelemetryOSD = ({ compact = false, onTelemetryUpdate }) => {
    const [telemetry, setTelemetry] = useState(null);
    const [selectedDrone, setSelectedDrone] = useState('DJI Mavic 3');
    const [flightPhase, setFlightPhase] = useState('GROUNDED');
    const [annotations, setAnnotations] = useState([]);
    const [flightLog, setFlightLog] = useState([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [warnings, setWarnings] = useState([]);
    const simRef = useRef(null);
    const startTimeRef = useRef(null);

    // OSD Annotation patterns from common drone screens
    const OSD_FIELDS = [
        { key: 'altitude', label: 'ALT', unit: 'm', icon: '📏', parse: (v) => `${v.toFixed(1)} m` },
        { key: 'altitudeFt', label: 'ALT', unit: 'ft', icon: '📏', parse: (v) => `${v.toFixed(0)} ft` },
        { key: 'speed', label: 'SPD', unit: 'km/h', icon: '💨', parse: (v) => `${v.toFixed(1)} km/h` },
        { key: 'speedKnots', label: 'SPD', unit: 'kts', icon: '💨', parse: (v) => `${v.toFixed(1)} kts` },
        { key: 'vSpeed', label: 'V/S', unit: 'm/s', icon: '↕️', parse: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} m/s` },
        { key: 'heading', label: 'HDG', unit: '°', icon: '🧭', parse: (v) => `${v.toFixed(0)}°` },
        { key: 'latitude', label: 'LAT', unit: '', icon: '📍', parse: (v) => `${v.toFixed(6)}°` },
        { key: 'longitude', label: 'LON', unit: '', icon: '📍', parse: (v) => `${v.toFixed(6)}°` },
        { key: 'battery', label: 'BAT', unit: '%', icon: '🔋', parse: (v) => `${v.toFixed(0)}%` },
        { key: 'signal', label: 'SIG', unit: 'dBm', icon: '📶', parse: (v) => `${v.toFixed(0)} dBm` },
        { key: 'satellites', label: 'SAT', unit: '', icon: '🛰️', parse: (v) => `${Math.round(v)}` },
        { key: 'distFromHome', label: 'DIST', unit: 'm', icon: '🏠', parse: (v) => `${v.toFixed(0)} m` },
        { key: 'windSpeed', label: 'WIND', unit: 'km/h', icon: '🌬️', parse: (v) => `${v.toFixed(1)} km/h` },
        { key: 'gForce', label: 'G', unit: 'g', icon: '⚡', parse: (v) => `${v.toFixed(2)} g` },
    ];

    // Generate realistic telemetry data (simulating annotation parsing)
    const generateTelemetry = useCallback((elapsed) => {
        const profile = DRONE_PROFILES[selectedDrone];
        const t = elapsed / 1000; // seconds
        const phase = t % 300; // 5-minute cycle

        // Simulate a realistic flight profile
        let altitude, speed, vSpeed, heading, battery, lat, lon;
        const baseLat = 6.5244;
        const baseLon = 3.3792;

        if (phase < 10) {
            // Pre-flight / Grounded
            altitude = 0;
            speed = 0;
            vSpeed = 0;
            heading = 45;
            lat = baseLat;
            lon = baseLon;
        } else if (phase < 30) {
            // Takeoff
            const p = (phase - 10) / 20;
            altitude = p * 50;
            speed = p * 5;
            vSpeed = 2.5;
            heading = 45;
            lat = baseLat;
            lon = baseLon;
        } else if (phase < 60) {
            // Climb to mission altitude
            const p = (phase - 30) / 30;
            altitude = 50 + p * 70;
            speed = 5 + p * 25;
            vSpeed = 2.0 + Math.sin(p * Math.PI) * 0.5;
            heading = 45 + p * 30;
            lat = baseLat + p * 0.002;
            lon = baseLon + p * 0.001;
        } else if (phase < 200) {
            // Cruising / Mission
            const p = (phase - 60) / 140;
            altitude = 120 + Math.sin(p * Math.PI * 3) * 15;
            speed = profile.cruiseSpeed * (0.8 + Math.sin(p * Math.PI * 2) * 0.2);
            vSpeed = Math.sin(p * Math.PI * 6) * 0.8;
            heading = (75 + p * 270 + Math.sin(p * Math.PI * 4) * 20) % 360;
            const orbitR = 0.01;
            lat = baseLat + 0.003 + Math.sin(p * Math.PI * 2) * orbitR;
            lon = baseLon + 0.003 + Math.cos(p * Math.PI * 2) * orbitR;
        } else if (phase < 260) {
            // Return / Descend
            const p = (phase - 200) / 60;
            altitude = 120 * (1 - p * 0.7);
            speed = profile.cruiseSpeed * (0.9 - p * 0.5);
            vSpeed = -1.5 - Math.sin(p * Math.PI) * 0.5;
            heading = (345 + p * 60) % 360;
            lat = baseLat + 0.003 * (1 - p);
            lon = baseLon + 0.003 * (1 - p);
        } else {
            // Landing
            const p = (phase - 260) / 40;
            altitude = 36 * (1 - p);
            speed = Math.max(0, 10 * (1 - p));
            vSpeed = -0.8 * (1 - p * 0.5);
            heading = 45;
            lat = baseLat + 0.0002 * (1 - p);
            lon = baseLon + 0.0001 * (1 - p);
        }

        // Add realistic sensor noise
        altitude += (Math.random() - 0.5) * 0.4;
        speed += (Math.random() - 0.5) * 0.5;
        vSpeed += (Math.random() - 0.5) * 0.1;
        heading += (Math.random() - 0.5) * 0.5;
        lat += (Math.random() - 0.5) * 0.000001;
        lon += (Math.random() - 0.5) * 0.000001;

        // Battery drain simulation
        battery = Math.max(0, 100 - (t / (profile.batteryTime * 60)) * 100);

        // Derived values
        const altitudeFt = altitude * 3.28084;
        const speedKnots = speed * 0.539957;
        const distFromHome = Math.sqrt(Math.pow((lat - baseLat) * 111000, 2) + Math.pow((lon - baseLon) * 111000 * Math.cos(baseLat * Math.PI / 180), 2));
        const satellites = Math.floor(12 + Math.random() * 6);
        const signal = -45 - distFromHome * 0.02 + (Math.random() - 0.5) * 5;
        const windSpeed = 8 + Math.sin(t * 0.01) * 6 + (Math.random() - 0.5) * 2;
        const gForce = 1.0 + Math.abs(vSpeed) * 0.05 + (speed > 30 ? 0.1 : 0) + (Math.random() - 0.5) * 0.02;

        return {
            altitude: Math.max(0, altitude),
            altitudeFt: Math.max(0, altitudeFt),
            speed: Math.max(0, speed),
            speedKnots: Math.max(0, speedKnots),
            vSpeed,
            heading: ((heading % 360) + 360) % 360,
            latitude: lat,
            longitude: lon,
            battery: Math.max(0, battery),
            signal: Math.max(-120, signal),
            satellites,
            distFromHome,
            windSpeed: Math.max(0, windSpeed),
            gForce,
            timestamp: Date.now(),
            droneModel: selectedDrone,
        };
    }, [selectedDrone]);

    // Detect flight phase from telemetry
    const detectFlightPhase = useCallback((tel) => {
        if (!tel) return 'GROUNDED';
        const { altitude, speed, vSpeed } = tel;

        if (altitude < 5 && speed < 1) return 'GROUNDED';
        if (altitude < 50 && vSpeed > 1.5) return 'TAKEOFF';
        if (altitude < 15 && vSpeed < -0.3) return 'LANDING';
        if (vSpeed > 0.5) return 'CLIMBING';
        if (vSpeed < -0.5) return 'DESCENDING';
        if (speed < 2 && Math.abs(vSpeed) < 0.3) return 'HOVERING';
        if (speed > 5 && Math.abs(vSpeed) < 0.5) return 'CRUISING';
        return 'CRUISING';
    }, []);

    // Generate warnings
    const checkWarnings = useCallback((tel) => {
        if (!tel) return [];
        const profile = DRONE_PROFILES[tel.droneModel];
        const warns = [];

        if (tel.battery < 20) warns.push({ level: 'critical', msg: `LOW BATTERY: ${tel.battery.toFixed(0)}%`, icon: '🔋' });
        else if (tel.battery < 30) warns.push({ level: 'warning', msg: `Battery: ${tel.battery.toFixed(0)}%`, icon: '🔋' });

        if (tel.signal < -90) warns.push({ level: 'critical', msg: 'WEAK SIGNAL', icon: '📶' });
        else if (tel.signal < -75) warns.push({ level: 'warning', msg: 'Signal Degraded', icon: '📶' });

        if (tel.windSpeed > profile.maxWind * 0.8) warns.push({ level: 'critical', msg: `HIGH WIND: ${tel.windSpeed.toFixed(0)} km/h`, icon: '🌬️' });
        else if (tel.windSpeed > profile.maxWind * 0.6) warns.push({ level: 'warning', msg: `Wind Advisory: ${tel.windSpeed.toFixed(0)} km/h`, icon: '🌬️' });

        if (tel.altitude > profile.maxAlt * 0.9) warns.push({ level: 'warning', msg: 'APPROACHING MAX ALT', icon: '📏' });

        if (tel.satellites < 6) warns.push({ level: 'warning', msg: `Low GPS: ${tel.satellites} sats`, icon: '🛰️' });

        if (tel.gForce > 1.5) warns.push({ level: 'warning', msg: `High G-Force: ${tel.gForce.toFixed(2)}g`, icon: '⚡' });

        return warns;
    }, []);

    // Start/stop simulation
    const toggleSimulation = useCallback(() => {
        if (isSimulating) {
            clearInterval(simRef.current);
            simRef.current = null;
            setIsSimulating(false);
        } else {
            startTimeRef.current = Date.now();
            setIsSimulating(true);
            setFlightLog([]);
        }
    }, [isSimulating]);

    // Simulation loop
    useEffect(() => {
        if (!isSimulating) return;

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            setElapsedTime(elapsed);

            const tel = generateTelemetry(elapsed);
            setTelemetry(tel);

            const phase = detectFlightPhase(tel);
            setFlightPhase(phase);

            const warns = checkWarnings(tel);
            setWarnings(warns);

            // Build annotation data
            const annots = OSD_FIELDS.map(field => ({
                ...field,
                value: tel[field.key],
                formatted: field.parse(tel[field.key]),
            }));
            setAnnotations(annots);

            // Log position for flight path
            setFlightLog(prev => {
                const next = [...prev, { lat: tel.latitude, lon: tel.longitude, alt: tel.altitude, ts: tel.timestamp }];
                return next.length > 500 ? next.slice(-500) : next;
            });

            // Notify parent
            if (onTelemetryUpdate) onTelemetryUpdate(tel);
        }, 500);

        simRef.current = interval;
        return () => clearInterval(interval);
    }, [isSimulating, generateTelemetry, detectFlightPhase, checkWarnings, onTelemetryUpdate]);

    const formatElapsed = (ms) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };

    const headingToCompass = (deg) => {
        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return dirs[Math.round(deg / 22.5) % 16];
    };

    const phaseInfo = FLIGHT_PHASES[flightPhase] || FLIGHT_PHASES.GROUNDED;
    const profile = DRONE_PROFILES[selectedDrone];

    if (compact) {
        return (
            <div className="bg-bornebit-surface rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-bornebit-primary uppercase tracking-wider">OSD</span>
                        <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                    </div>
                    <button
                        onClick={toggleSimulation}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${isSimulating
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}
                    >
                        {isSimulating ? 'STOP' : 'START'}
                    </button>
                </div>
                {telemetry ? (
                    <div className="grid grid-cols-2 gap-1.5">
                        {[
                            { l: 'ALT', v: `${telemetry.altitude.toFixed(1)}m`, c: 'text-cyan-400' },
                            { l: 'SPD', v: `${telemetry.speed.toFixed(1)}km/h`, c: 'text-green-400' },
                            { l: 'HDG', v: `${telemetry.heading.toFixed(0)}° ${headingToCompass(telemetry.heading)}`, c: 'text-amber-400' },
                            { l: 'BAT', v: `${telemetry.battery.toFixed(0)}%`, c: telemetry.battery < 20 ? 'text-red-400' : 'text-green-400' },
                        ].map(d => (
                            <div key={d.l} className="bg-black/40 rounded px-2 py-1.5">
                                <div className="text-[9px] text-gray-600 font-mono">{d.l}</div>
                                <div className={`text-xs font-bold font-mono ${d.c}`}>{d.v}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-[10px] text-gray-600 text-center py-3 font-mono">Start simulation to parse OSD</div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-bornebit-surface rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="bg-black/40 border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-cyan-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">OSD Telemetry Parser</h3>
                        <p className="text-[10px] text-gray-500">Flight parameter extraction from drone annotations</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedDrone}
                        onChange={e => setSelectedDrone(e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                    >
                        {Object.keys(DRONE_PROFILES).map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <button
                        onClick={toggleSimulation}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isSimulating
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                            : 'bg-gradient-to-r from-cyan-500/20 to-green-500/20 text-green-400 border border-green-500/30 hover:from-cyan-500/30 hover:to-green-500/30'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                        {isSimulating ? 'Stop Feed' : 'Start Feed'}
                    </button>
                </div>
            </div>

            {/* Flight Phase Banner */}
            {telemetry && (
                <div className="px-5 py-2.5 flex items-center justify-between" style={{ backgroundColor: `${phaseInfo.color}15`, borderBottom: `1px solid ${phaseInfo.color}30` }}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{phaseInfo.icon}</span>
                        <span className="text-sm font-bold" style={{ color: phaseInfo.color }}>{phaseInfo.label}</span>
                        <span className="text-[10px] text-gray-500 font-mono ml-2">Flight Time: {formatElapsed(elapsedTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-black/40 text-gray-400 px-2 py-0.5 rounded font-mono">{selectedDrone}</span>
                        <span className="text-[10px] bg-black/40 text-gray-400 px-2 py-0.5 rounded font-mono">{telemetry.satellites} SAT</span>
                    </div>
                </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
                <div className="px-5 py-2 space-y-1">
                    {warnings.map((w, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono ${w.level === 'critical'
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse'
                            : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                            }`}>
                            <span>{w.icon}</span>
                            <span>{w.msg}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Telemetry Grid */}
            <div className="p-5">
                {telemetry ? (
                    <div className="space-y-4">
                        {/* Primary Flight Instruments */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Altitude */}
                            <div className="bg-black/40 rounded-xl p-3 border border-cyan-500/10">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">📏 ALTITUDE</div>
                                <div className="text-xl font-bold text-cyan-400 font-mono">{telemetry.altitude.toFixed(1)}<span className="text-xs text-gray-500 ml-1">m</span></div>
                                <div className="text-[10px] text-gray-600 font-mono">{telemetry.altitudeFt.toFixed(0)} ft AGL</div>
                                <div className="mt-2 w-full h-1 bg-black/60 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (telemetry.altitude / profile.maxAlt) * 100)}%` }}></div>
                                </div>
                            </div>

                            {/* Speed */}
                            <div className="bg-black/40 rounded-xl p-3 border border-green-500/10">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">💨 SPEED</div>
                                <div className="text-xl font-bold text-green-400 font-mono">{telemetry.speed.toFixed(1)}<span className="text-xs text-gray-500 ml-1">km/h</span></div>
                                <div className="text-[10px] text-gray-600 font-mono">{telemetry.speedKnots.toFixed(1)} kts</div>
                                <div className="mt-2 w-full h-1 bg-black/60 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(100, (telemetry.speed / profile.maxSpeed) * 100)}%` }}></div>
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="bg-black/40 rounded-xl p-3 border border-amber-500/10">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">🧭 HEADING</div>
                                <div className="text-xl font-bold text-amber-400 font-mono">{telemetry.heading.toFixed(0)}<span className="text-xs text-gray-500 ml-1">°</span></div>
                                <div className="text-[10px] text-gray-600 font-mono">{headingToCompass(telemetry.heading)}</div>
                                {/* Mini compass */}
                                <div className="mt-2 flex justify-center">
                                    <div className="w-8 h-8 rounded-full border border-amber-500/30 relative">
                                        <div
                                            className="absolute w-0.5 h-3 bg-amber-400 rounded-full left-1/2 -translate-x-1/2 origin-bottom"
                                            style={{ bottom: '50%', transform: `translateX(-50%) rotate(${telemetry.heading}deg)` }}
                                        ></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vertical Speed */}
                            <div className="bg-black/40 rounded-xl p-3 border border-purple-500/10">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">↕️ V/SPEED</div>
                                <div className={`text-xl font-bold font-mono ${telemetry.vSpeed > 0 ? 'text-green-400' : telemetry.vSpeed < -1 ? 'text-red-400' : 'text-purple-400'}`}>
                                    {telemetry.vSpeed > 0 ? '+' : ''}{telemetry.vSpeed.toFixed(1)}<span className="text-xs text-gray-500 ml-1">m/s</span>
                                </div>
                                <div className="text-[10px] text-gray-600 font-mono">{(telemetry.vSpeed * 196.85).toFixed(0)} ft/min</div>
                            </div>
                        </div>

                        {/* Secondary Data */}
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {[
                                { label: 'Battery', value: `${telemetry.battery.toFixed(0)}%`, color: telemetry.battery < 20 ? 'text-red-400' : telemetry.battery < 40 ? 'text-yellow-400' : 'text-green-400', icon: '🔋' },
                                { label: 'Signal', value: `${telemetry.signal.toFixed(0)}dBm`, color: telemetry.signal < -90 ? 'text-red-400' : 'text-green-400', icon: '📶' },
                                { label: 'GPS Sats', value: telemetry.satellites, color: telemetry.satellites < 6 ? 'text-yellow-400' : 'text-green-400', icon: '🛰️' },
                                { label: 'Distance', value: `${telemetry.distFromHome.toFixed(0)}m`, color: 'text-blue-400', icon: '🏠' },
                                { label: 'Wind', value: `${telemetry.windSpeed.toFixed(0)}km/h`, color: telemetry.windSpeed > 30 ? 'text-red-400' : 'text-amber-400', icon: '🌬️' },
                                { label: 'G-Force', value: `${telemetry.gForce.toFixed(2)}g`, color: telemetry.gForce > 1.5 ? 'text-red-400' : 'text-gray-400', icon: '⚡' },
                            ].map(d => (
                                <div key={d.label} className="bg-black/30 rounded-lg p-2 text-center border border-white/5 hover:border-white/10 transition-all">
                                    <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">{d.icon} {d.label}</div>
                                    <div className={`text-sm font-bold font-mono ${d.color}`}>{d.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* GPS Coordinates */}
                        <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] text-gray-600 uppercase tracking-wider font-mono">📍 GPS POSITION</div>
                                <div className="text-[10px] text-gray-600 font-mono">Flight Log: {flightLog.length} pts</div>
                            </div>
                            <div className="mt-1 flex items-center gap-4">
                                <div className="text-sm font-mono text-cyan-400">{telemetry.latitude.toFixed(6)}° N</div>
                                <div className="text-sm font-mono text-cyan-400">{telemetry.longitude.toFixed(6)}° E</div>
                            </div>
                        </div>

                        {/* Drone Specs */}
                        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                            <div className="text-[10px] text-gray-600 uppercase tracking-wider font-mono mb-2">✈️ AIRCRAFT PROFILE: {selectedDrone}</div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {[
                                    { l: 'Max Alt', v: `${profile.maxAlt}m` },
                                    { l: 'Max Speed', v: `${profile.maxSpeed}km/h` },
                                    { l: 'Cruise', v: `${profile.cruiseSpeed}km/h` },
                                    { l: 'Max Wind', v: `${profile.maxWind}km/h` },
                                    { l: 'Flight Time', v: `${profile.batteryTime}min` },
                                ].map(s => (
                                    <div key={s.l} className="text-center">
                                        <div className="text-[9px] text-gray-600 uppercase">{s.l}</div>
                                        <div className="text-xs font-mono text-white">{s.v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/10 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-cyan-500/40">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">OSD Annotation Parser</h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                            Extract altitude, speed, GPS, heading, and all flight parameters from your drone's On-Screen Display annotations. Click "Start Feed" to begin parsing.
                        </p>
                        <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600">
                            <span>■ Supports DJI • Autel • Custom builds</span>
                            <span>■ Real-time parameter estimation</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DroneTelemetryOSD;
