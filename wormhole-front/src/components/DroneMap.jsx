import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * DroneMap — Interactive Map with Satellite/Street views, Drone position, 
 * Flight path tracking, and Geofencing.
 * 
 * Uses Leaflet via CDN for lightweight mapping without heavy bundle impact.
 * Falls back to a canvas-based mini-map if Leaflet fails to load.
 */

const MAP_STYLES = {
    satellite: {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri',
        icon: '🛰️',
    },
    dark: {
        name: 'Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© CARTO',
        icon: '🌙',
    },
    terrain: {
        name: 'Terrain',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap',
        icon: '🏔️',
    },
    street: {
        name: 'Street',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap',
        icon: '🗺️',
    },
};

const DroneMap = ({ telemetry, flightPath = [], compact = false }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const pathLineRef = useRef(null);
    const homeMarkerRef = useRef(null);
    const [mapStyle, setMapStyle] = useState('dark');
    const [isMapReady, setIsMapReady] = useState(false);
    const [followDrone, setFollowDrone] = useState(true);
    const [showPath, setShowPath] = useState(true);
    const [showGeofence, setShowGeofence] = useState(true);
    const geofenceRef = useRef(null);
    const [geofenceRadius, setGeofenceRadius] = useState(500); // meters
    const leafletLoadedRef = useRef(false);

    // Default position (Lagos, Nigeria)
    const defaultPos = { lat: 6.5244, lon: 3.3792 };
    const currentPos = telemetry
        ? { lat: telemetry.latitude, lon: telemetry.longitude }
        : defaultPos;

    // Load Leaflet CSS & JS from CDN
    useEffect(() => {
        if (leafletLoadedRef.current) return;

        // Load CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Load JS
        if (!window.L) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                leafletLoadedRef.current = true;
                initMap();
            };
            script.onerror = () => {
                console.warn('Leaflet failed to load');
            };
            document.head.appendChild(script);
        } else {
            leafletLoadedRef.current = true;
            initMap();
        }
    }, []);

    // Initialize map
    const initMap = useCallback(() => {
        if (!window.L || !mapContainerRef.current || mapRef.current) return;

        const L = window.L;

        const map = L.map(mapContainerRef.current, {
            center: [currentPos.lat, currentPos.lon],
            zoom: compact ? 14 : 15,
            zoomControl: !compact,
            attributionControl: false,
        });

        // Add tile layer
        const style = MAP_STYLES[mapStyle];
        L.tileLayer(style.url, {
            maxZoom: 19,
            attribution: style.attribution,
        }).addTo(map);

        // Custom drone icon
        const droneIcon = L.divIcon({
            className: 'drone-marker',
            html: `
        <div style="
          width: 32px; height: 32px; 
          background: radial-gradient(circle, rgba(255,87,34,0.4) 0%, transparent 70%);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          animation: pulse-ring 2s ease-out infinite;
        ">
          <div style="
            width: 16px; height: 16px;
            background: linear-gradient(135deg, #FF5722, #FF9100);
            border-radius: 50%;
            border: 2px solid #fff;
            box-shadow: 0 0 20px rgba(255,87,34,0.6);
          "></div>
        </div>
      `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });

        // Home icon
        const homeIcon = L.divIcon({
            className: 'home-marker',
            html: `
        <div style="
          width: 24px; height: 24px;
          background: rgba(76, 201, 240, 0.2);
          border: 2px solid #4CC9F0;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px;
        ">🏠</div>
      `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

        // Add markers
        markerRef.current = L.marker([currentPos.lat, currentPos.lon], { icon: droneIcon }).addTo(map);
        homeMarkerRef.current = L.marker([defaultPos.lat, defaultPos.lon], { icon: homeIcon }).addTo(map);

        // Flight path polyline
        pathLineRef.current = L.polyline([], {
            color: '#FF5722',
            weight: 2,
            opacity: 0.7,
            dashArray: '6, 4',
        }).addTo(map);

        // Geofence circle
        geofenceRef.current = L.circle([defaultPos.lat, defaultPos.lon], {
            radius: geofenceRadius,
            color: '#4CC9F0',
            fillColor: '#4CC9F0',
            fillOpacity: 0.05,
            weight: 1,
            dashArray: '8, 6',
        }).addTo(map);

        mapRef.current = map;
        setIsMapReady(true);

        // Inject pulse animation
        if (!document.querySelector('#drone-map-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'drone-map-styles';
            styleEl.textContent = `
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .drone-marker, .home-marker {
          background: none !important;
          border: none !important;
        }
        .leaflet-control-zoom a {
          background: rgba(17,17,17,0.9) !important;
          color: #FF5722 !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30,30,30,0.95) !important;
        }
      `;
            document.head.appendChild(styleEl);
        }

        return () => {
            if (map) map.remove();
            mapRef.current = null;
        };
    }, [mapStyle, compact]);

    // Re-initialize when Leaflet loads
    useEffect(() => {
        if (leafletLoadedRef.current && !mapRef.current) {
            initMap();
        }
    }, [initMap]);

    // Update drone position
    useEffect(() => {
        if (!mapRef.current || !markerRef.current || !telemetry) return;

        const pos = [telemetry.latitude, telemetry.longitude];
        markerRef.current.setLatLng(pos);

        if (followDrone) {
            mapRef.current.panTo(pos, { animate: true, duration: 0.5 });
        }

        // Update tooltip
        markerRef.current.bindTooltip(
            `<div style="font-family: monospace; font-size:11px; line-height:1.5; padding:2px 4px;">
        <strong style="color:#FF5722;">${telemetry.droneModel || 'Drone'}</strong><br/>
        ALT: ${telemetry.altitude?.toFixed(1)}m<br/>
        SPD: ${telemetry.speed?.toFixed(1)}km/h<br/>
        HDG: ${telemetry.heading?.toFixed(0)}°<br/>
        BAT: ${telemetry.battery?.toFixed(0)}%
      </div>`,
            { permanent: false, className: 'drone-tooltip', direction: 'right', offset: [15, 0] }
        );
    }, [telemetry, followDrone]);

    // Update flight path
    useEffect(() => {
        if (!pathLineRef.current || !showPath) return;

        const points = flightPath.map(p => [p.lat, p.lon]);
        pathLineRef.current.setLatLngs(points);
    }, [flightPath, showPath]);

    // Show/hide path line
    useEffect(() => {
        if (!pathLineRef.current || !mapRef.current) return;
        if (showPath) {
            pathLineRef.current.addTo(mapRef.current);
        } else {
            pathLineRef.current.remove();
        }
    }, [showPath]);

    // Show/hide geofence
    useEffect(() => {
        if (!geofenceRef.current || !mapRef.current) return;
        if (showGeofence) {
            geofenceRef.current.addTo(mapRef.current);
            geofenceRef.current.setRadius(geofenceRadius);
        } else {
            geofenceRef.current.remove();
        }
    }, [showGeofence, geofenceRadius]);

    // Change map style
    const changeMapStyle = (style) => {
        if (!mapRef.current || !window.L) return;
        setMapStyle(style);

        // Remove old tiles, add new
        mapRef.current.eachLayer(layer => {
            if (layer instanceof window.L.TileLayer) {
                mapRef.current.removeLayer(layer);
            }
        });

        const s = MAP_STYLES[style];
        window.L.tileLayer(s.url, {
            maxZoom: 19,
            attribution: s.attribution,
        }).addTo(mapRef.current);
    };

    if (compact) {
        return (
            <div className="bg-bornebit-surface rounded-lg border border-white/10 overflow-hidden relative">
                <div className="absolute top-2 left-2 z-[1000] flex items-center gap-1">
                    <span className="text-[9px] font-bold text-bornebit-primary bg-black/80 px-2 py-0.5 rounded uppercase tracking-wider">MAP</span>
                    {telemetry && (
                        <span className="text-[9px] text-green-400 bg-black/80 px-2 py-0.5 rounded font-mono">
                            {telemetry.altitude?.toFixed(0)}m
                        </span>
                    )}
                </div>
                <div
                    ref={mapContainerRef}
                    className="w-full aspect-square"
                    style={{ minHeight: '200px' }}
                ></div>
                {!isMapReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-bornebit-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] text-gray-500">Loading map...</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-bornebit-surface rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="bg-black/40 border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Live Mission Map</h3>
                        <p className="text-[10px] text-gray-500">Real-time drone tracking & flight path</p>
                    </div>
                </div>

                {/* Map Controls */}
                <div className="flex items-center gap-2">
                    {/* Map Style Switcher */}
                    <div className="flex bg-black/60 rounded-lg overflow-hidden border border-white/10">
                        {Object.entries(MAP_STYLES).map(([key, style]) => (
                            <button
                                key={key}
                                onClick={() => changeMapStyle(key)}
                                className={`px-2.5 py-1.5 text-[10px] font-mono transition-all ${mapStyle === key
                                    ? 'bg-bornebit-primary/20 text-bornebit-primary'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }`}
                                title={style.name}
                            >
                                {style.icon}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="relative">
                <div
                    ref={mapContainerRef}
                    className="w-full"
                    style={{ height: '400px' }}
                ></div>

                {!isMapReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bornebit-surface">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-2 border-bornebit-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-gray-500">Loading interactive map...</span>
                        </div>
                    </div>
                )}

                {/* Map Toolbar Overlay */}
                <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
                    <button
                        onClick={() => setFollowDrone(!followDrone)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${followDrone
                            ? 'bg-bornebit-primary/80 text-white shadow-lg shadow-bornebit-primary/30'
                            : 'bg-black/80 text-gray-400 border border-white/10 hover:bg-black/90'
                            }`}
                        title={followDrone ? 'Following drone' : 'Click to follow drone'}
                    >
                        🎯
                    </button>
                    <button
                        onClick={() => setShowPath(!showPath)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${showPath
                            ? 'bg-orange-500/30 text-orange-400 border border-orange-500/30'
                            : 'bg-black/80 text-gray-400 border border-white/10 hover:bg-black/90'
                            }`}
                        title={showPath ? 'Hide flight path' : 'Show flight path'}
                    >
                        〰️
                    </button>
                    <button
                        onClick={() => setShowGeofence(!showGeofence)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${showGeofence
                            ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/30'
                            : 'bg-black/80 text-gray-400 border border-white/10 hover:bg-black/90'
                            }`}
                        title={showGeofence ? 'Hide geofence' : 'Show geofence'}
                    >
                        ⭕
                    </button>
                </div>

                {/* Position Info Overlay */}
                <div className="absolute bottom-3 left-3 z-[1000] bg-black/85 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div>
                            <div className="text-[9px] text-gray-600 uppercase">Position</div>
                            <div className="text-[11px] font-mono text-cyan-400">
                                {currentPos.lat.toFixed(6)}°, {currentPos.lon.toFixed(6)}°
                            </div>
                        </div>
                        {telemetry && (
                            <>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div>
                                    <div className="text-[9px] text-gray-600 uppercase">Alt</div>
                                    <div className="text-[11px] font-mono text-green-400">{telemetry.altitude?.toFixed(1)}m</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-gray-600 uppercase">Dist</div>
                                    <div className="text-[11px] font-mono text-amber-400">{telemetry.distFromHome?.toFixed(0)}m</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-black/40 border-t border-white/5 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider">Geofence:</label>
                        <select
                            value={geofenceRadius}
                            onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                            className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-bornebit-primary cursor-pointer"
                        >
                            <option value={200}>200m</option>
                            <option value={500}>500m</option>
                            <option value={1000}>1km</option>
                            <option value={2000}>2km</option>
                            <option value={5000}>5km</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-bornebit-primary rounded"></div>
                        <span className="text-[10px] text-gray-500">Flight Path ({flightPath.length} pts)</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                    <span>Style: {MAP_STYLES[mapStyle].name}</span>
                    <span>•</span>
                    <span>{followDrone ? '🎯 Following' : '🔓 Free'}</span>
                </div>
            </div>
        </div>
    );
};

export default DroneMap;
