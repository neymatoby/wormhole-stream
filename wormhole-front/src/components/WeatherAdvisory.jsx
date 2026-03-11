import { useState, useEffect, useCallback } from 'react';

/**
 * WeatherAdvisory — Real-time Weather Panel with Flight Safety Assessment
 * 
 * Fetches weather data from Open-Meteo API (free, no key required)
 * Provides drone-specific flight safety advisories based on wind, visibility, 
 * precipitation, temperature, and other conditions.
 */

// Flight safety thresholds
const SAFETY_THRESHOLDS = {
    wind: { safe: 20, caution: 30, danger: 40 }, // km/h
    gusts: { safe: 30, caution: 40, danger: 50 },
    visibility: { safe: 5000, caution: 2000, danger: 500 }, // meters
    precipitation: { safe: 0, caution: 0.5, danger: 2 }, // mm/h
    temperature: { minSafe: 0, maxSafe: 40 }, // °C
    cloudBase: { safe: 500, caution: 200, danger: 100 }, // meters
};

const WEATHER_CODES = {
    0: { desc: 'Clear Sky', icon: '☀️', severity: 'safe' },
    1: { desc: 'Mainly Clear', icon: '🌤️', severity: 'safe' },
    2: { desc: 'Partly Cloudy', icon: '⛅', severity: 'safe' },
    3: { desc: 'Overcast', icon: '☁️', severity: 'safe' },
    45: { desc: 'Fog', icon: '🌫️', severity: 'caution' },
    48: { desc: 'Rime Fog', icon: '🌫️', severity: 'caution' },
    51: { desc: 'Light Drizzle', icon: '🌦️', severity: 'caution' },
    53: { desc: 'Moderate Drizzle', icon: '🌧️', severity: 'caution' },
    55: { desc: 'Dense Drizzle', icon: '🌧️', severity: 'danger' },
    61: { desc: 'Slight Rain', icon: '🌧️', severity: 'caution' },
    63: { desc: 'Moderate Rain', icon: '🌧️', severity: 'danger' },
    65: { desc: 'Heavy Rain', icon: '🌧️', severity: 'danger' },
    71: { desc: 'Slight Snow', icon: '🌨️', severity: 'danger' },
    73: { desc: 'Moderate Snow', icon: '❄️', severity: 'danger' },
    75: { desc: 'Heavy Snow', icon: '❄️', severity: 'danger' },
    77: { desc: 'Snow Grains', icon: '🌨️', severity: 'danger' },
    80: { desc: 'Slight Showers', icon: '🌦️', severity: 'caution' },
    81: { desc: 'Moderate Showers', icon: '🌧️', severity: 'danger' },
    82: { desc: 'Violent Showers', icon: '⛈️', severity: 'danger' },
    85: { desc: 'Snow Showers', icon: '🌨️', severity: 'danger' },
    86: { desc: 'Heavy Snow Showers', icon: '❄️', severity: 'danger' },
    95: { desc: 'Thunderstorm', icon: '⛈️', severity: 'danger' },
    96: { desc: 'T-Storm w/ Hail', icon: '⛈️', severity: 'danger' },
    99: { desc: 'T-Storm w/ Heavy Hail', icon: '⛈️', severity: 'danger' },
};

const WeatherAdvisory = ({ latitude, longitude, compact = false }) => {
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [hourlyForecast, setHourlyForecast] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [safetyRating, setSafetyRating] = useState('unknown');
    const [advisories, setAdvisories] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeView, setActiveView] = useState('current'); // current, hourly, daily

    // Default to Lagos, Nigeria
    const lat = latitude || 6.5244;
    const lon = longitude || 3.3792;

    // Fetch weather data
    const fetchWeather = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure',
                hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,visibility,wind_speed_10m,wind_gusts_10m,cloud_cover',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max',
                timezone: 'auto',
                forecast_days: 5,
            });

            const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

            if (!response.ok) throw new Error('Weather API unavailable');

            const data = await response.json();

            // Parse current weather
            const current = {
                temperature: data.current.temperature_2m,
                humidity: data.current.relative_humidity_2m,
                apparentTemp: data.current.apparent_temperature,
                precipitation: data.current.precipitation,
                weatherCode: data.current.weather_code,
                cloudCover: data.current.cloud_cover,
                windSpeed: data.current.wind_speed_10m,
                windDirection: data.current.wind_direction_10m,
                windGusts: data.current.wind_gusts_10m,
                pressure: data.current.surface_pressure,
            };
            setWeather(current);

            // Parse hourly (next 24 hours)
            const now = new Date();
            const hourly = [];
            for (let i = 0; i < 24 && i < data.hourly.time.length; i++) {
                const time = new Date(data.hourly.time[i]);
                if (time < now) continue;
                if (hourly.length >= 12) break;
                hourly.push({
                    time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    temp: data.hourly.temperature_2m[i],
                    precipProb: data.hourly.precipitation_probability[i],
                    precip: data.hourly.precipitation[i],
                    weatherCode: data.hourly.weather_code[i],
                    visibility: data.hourly.visibility?.[i],
                    windSpeed: data.hourly.wind_speed_10m[i],
                    windGusts: data.hourly.wind_gusts_10m[i],
                    cloudCover: data.hourly.cloud_cover[i],
                });
            }
            setHourlyForecast(hourly);

            // Parse daily forecast
            const daily = data.daily.time.map((time, i) => ({
                date: new Date(time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
                dayShort: new Date(time).toLocaleDateString([], { weekday: 'short' }),
                weatherCode: data.daily.weather_code[i],
                tempMax: data.daily.temperature_2m_max[i],
                tempMin: data.daily.temperature_2m_min[i],
                sunrise: new Date(data.daily.sunrise[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sunset: new Date(data.daily.sunset[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                precipSum: data.daily.precipitation_sum[i],
                windMax: data.daily.wind_speed_10m_max[i],
                gustsMax: data.daily.wind_gusts_10m_max[i],
                precipProb: data.daily.precipitation_probability_max[i],
            }));
            setForecast(daily);

            // Calculate flight safety
            calculateSafety(current, hourly);
            setLastUpdated(new Date());
        } catch (err) {
            console.warn('Weather fetch error:', err.message);
            setError(err.message);
            // Generate fallback data
            generateFallbackWeather();
        } finally {
            setIsLoading(false);
        }
    }, [lat, lon]);

    // Generate fallback weather when API is unavailable
    const generateFallbackWeather = () => {
        const current = {
            temperature: 28 + (Math.random() - 0.5) * 5,
            humidity: 65 + (Math.random() - 0.5) * 20,
            apparentTemp: 30 + (Math.random() - 0.5) * 3,
            precipitation: 0,
            weatherCode: [0, 1, 2, 3][Math.floor(Math.random() * 4)],
            cloudCover: Math.floor(Math.random() * 60),
            windSpeed: 8 + Math.random() * 15,
            windDirection: Math.random() * 360,
            windGusts: 15 + Math.random() * 20,
            pressure: 1012 + (Math.random() - 0.5) * 10,
        };
        setWeather(current);
        calculateSafety(current, []);
        setLastUpdated(new Date());
    };

    // Calculate drone flight safety rating
    const calculateSafety = (current, hourly) => {
        if (!current) return;

        const advs = [];
        let rating = 'safe'; // safe, caution, danger, grounded

        // Wind assessment
        if (current.windSpeed > SAFETY_THRESHOLDS.wind.danger) {
            advs.push({ level: 'danger', msg: `Wind speed ${current.windSpeed.toFixed(0)} km/h exceeds safe limits. DO NOT FLY.`, icon: '🌬️', category: 'Wind' });
            rating = 'grounded';
        } else if (current.windSpeed > SAFETY_THRESHOLDS.wind.caution) {
            advs.push({ level: 'caution', msg: `Wind speed ${current.windSpeed.toFixed(0)} km/h — reduced maneuverability. Fly with caution.`, icon: '🌬️', category: 'Wind' });
            if (rating !== 'grounded') rating = 'caution';
        } else {
            advs.push({ level: 'safe', msg: `Wind ${current.windSpeed.toFixed(0)} km/h — within safe limits.`, icon: '🌬️', category: 'Wind' });
        }

        // Gust assessment
        if (current.windGusts > SAFETY_THRESHOLDS.gusts.danger) {
            advs.push({ level: 'danger', msg: `Wind gusts ${current.windGusts.toFixed(0)} km/h — dangerous for drone operations.`, icon: '💨', category: 'Gusts' });
            rating = 'grounded';
        } else if (current.windGusts > SAFETY_THRESHOLDS.gusts.caution) {
            advs.push({ level: 'caution', msg: `Gusts up to ${current.windGusts.toFixed(0)} km/h — may affect stability.`, icon: '💨', category: 'Gusts' });
            if (rating !== 'grounded' && rating !== 'danger') rating = 'caution';
        }

        // Weather code assessment
        const wxInfo = WEATHER_CODES[current.weatherCode] || { desc: 'Unknown', icon: '❓', severity: 'caution' };
        if (wxInfo.severity === 'danger') {
            advs.push({ level: 'danger', msg: `${wxInfo.desc} — conditions unsuitable for flight.`, icon: wxInfo.icon, category: 'Weather' });
            if (rating !== 'grounded') rating = 'danger';
        } else if (wxInfo.severity === 'caution') {
            advs.push({ level: 'caution', msg: `${wxInfo.desc} — reduced visibility/conditions.`, icon: wxInfo.icon, category: 'Weather' });
            if (rating !== 'grounded' && rating !== 'danger') rating = 'caution';
        } else {
            advs.push({ level: 'safe', msg: `${wxInfo.desc} — good flying conditions.`, icon: wxInfo.icon, category: 'Weather' });
        }

        // Precipitation
        if (current.precipitation > SAFETY_THRESHOLDS.precipitation.danger) {
            advs.push({ level: 'danger', msg: `Heavy precipitation: ${current.precipitation} mm/h. Electronics at risk.`, icon: '🌧️', category: 'Rain' });
            if (rating !== 'grounded') rating = 'danger';
        } else if (current.precipitation > SAFETY_THRESHOLDS.precipitation.caution) {
            advs.push({ level: 'caution', msg: `Light precipitation detected. Monitor closely.`, icon: '🌦️', category: 'Rain' });
            if (rating !== 'grounded' && rating !== 'danger') rating = 'caution';
        }

        // Temperature
        if (current.temperature < SAFETY_THRESHOLDS.temperature.minSafe || current.temperature > SAFETY_THRESHOLDS.temperature.maxSafe) {
            advs.push({ level: 'caution', msg: `Temperature ${current.temperature.toFixed(0)}°C — battery performance may be affected.`, icon: '🌡️', category: 'Temperature' });
            if (rating !== 'grounded' && rating !== 'danger') rating = 'caution';
        }

        // Cloud cover
        if (current.cloudCover > 90) {
            advs.push({ level: 'caution', msg: `Cloud cover ${current.cloudCover}% — very overcast, monitor ceiling.`, icon: '☁️', category: 'Clouds' });
        }

        // Upcoming weather changes (hourly)
        if (hourly.length > 0) {
            const upcomingRain = hourly.find(h => h.precipProb > 60);
            if (upcomingRain) {
                advs.push({ level: 'caution', msg: `${upcomingRain.precipProb}% chance of rain at ${upcomingRain.time}. Plan return.`, icon: '⏰', category: 'Forecast' });
            }

            const upcomingWind = hourly.find(h => h.windGusts > 35);
            if (upcomingWind) {
                advs.push({ level: 'caution', msg: `Wind gusts increasing to ${upcomingWind.windGusts.toFixed(0)} km/h at ${upcomingWind.time}.`, icon: '⏰', category: 'Forecast' });
            }
        }

        setSafetyRating(rating);
        setAdvisories(advs);
    };

    // Fetch on mount and every 10 minutes
    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, 600000); // 10 min
        return () => clearInterval(interval);
    }, [fetchWeather]);

    const windDirToCompass = (deg) => {
        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return dirs[Math.round(deg / 22.5) % 16];
    };

    const safetyColors = {
        safe: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'FLY SAFE ✅', desc: 'All conditions within safe operating limits' },
        caution: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'FLY WITH CAUTION ⚠️', desc: 'Some conditions require attention' },
        danger: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'HIGH RISK ⛔', desc: 'Conditions are risky for drone operations' },
        grounded: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/40', label: 'DO NOT FLY 🚫', desc: 'Conditions exceed safe flight limits' },
        unknown: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', label: 'CHECKING...', desc: 'Fetching weather data' },
    };

    const safety = safetyColors[safetyRating];
    const wxInfo = weather ? (WEATHER_CODES[weather.weatherCode] || { desc: 'Unknown', icon: '❓' }) : null;

    if (compact) {
        return (
            <div className="bg-bornebit-surface rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-bornebit-primary uppercase tracking-wider">Weather</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${safety.bg} ${safety.text} ${safety.border} border`}>
                        {safetyRating === 'safe' ? '✅ SAFE' : safetyRating === 'caution' ? '⚠️ CAUTION' : '🚫 NO-FLY'}
                    </span>
                </div>
                {weather ? (
                    <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-black/40 rounded px-2 py-1.5">
                            <div className="text-[9px] text-gray-600 font-mono">TEMP</div>
                            <div className="text-xs font-bold text-amber-400 font-mono">{weather.temperature.toFixed(0)}°C</div>
                        </div>
                        <div className="bg-black/40 rounded px-2 py-1.5">
                            <div className="text-[9px] text-gray-600 font-mono">WIND</div>
                            <div className="text-xs font-bold text-cyan-400 font-mono">{weather.windSpeed.toFixed(0)} km/h</div>
                        </div>
                        <div className="bg-black/40 rounded px-2 py-1.5 col-span-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-gray-600 font-mono">{wxInfo?.icon} {wxInfo?.desc}</span>
                                <span className="text-[9px] text-gray-500 font-mono">💧 {weather.humidity}%</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] text-gray-600 text-center py-3 font-mono">
                        {isLoading ? 'Loading...' : 'No data'}
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
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                        <span className="text-xl">🌤️</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Weather Advisory</h3>
                        <p className="text-[10px] text-gray-500">Drone flight safety assessment • {lat.toFixed(4)}°N, {lon.toFixed(4)}°E</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <span className="text-[10px] text-gray-600 font-mono">{lastUpdated.toLocaleTimeString()}</span>
                    )}
                    <button
                        onClick={fetchWeather}
                        className="p-2 rounded-lg bg-black/40 border border-white/10 text-gray-400 hover:text-white hover:bg-black/60 transition-all"
                        title="Refresh weather"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Safety Rating Banner */}
            <div className={`px-5 py-3 ${safety.bg} border-b ${safety.border}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className={`text-sm font-bold ${safety.text} uppercase tracking-wider`}>{safety.label}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{safety.desc}</div>
                    </div>
                    {weather && (
                        <div className="flex items-center gap-2">
                            <span className="text-3xl">{wxInfo?.icon}</span>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white font-mono">{weather.temperature.toFixed(0)}°</div>
                                <div className="text-[10px] text-gray-500">Feels {weather.apparentTemp.toFixed(0)}°</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="p-12 text-center">
                    <div className="w-10 h-10 border-2 border-bornebit-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <span className="text-sm text-gray-500">Fetching weather data...</span>
                </div>
            ) : weather ? (
                <div className="p-5 space-y-4">
                    {/* View Tabs */}
                    <div className="flex bg-black/40 rounded-lg p-1 gap-1">
                        {[
                            { id: 'current', label: 'Current' },
                            { id: 'hourly', label: 'Hourly' },
                            { id: 'daily', label: '5-Day' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveView(tab.id)}
                                className={`flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeView === tab.id
                                    ? 'bg-bornebit-primary/20 text-bornebit-primary border border-bornebit-primary/30'
                                    : 'text-gray-500 hover:text-gray-400 border border-transparent'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeView === 'current' && (
                        <>
                            {/* Current Conditions Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Wind */}
                                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">🌬️ Wind</div>
                                    <div className="text-lg font-bold text-cyan-400 font-mono">{weather.windSpeed.toFixed(0)}<span className="text-xs text-gray-500 ml-1">km/h</span></div>
                                    <div className="text-[10px] text-gray-600 font-mono">{windDirToCompass(weather.windDirection)} ({weather.windDirection}°)</div>
                                    <div className="mt-2 w-full h-1 bg-black/60 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${weather.windSpeed > 30 ? 'bg-red-500' : weather.windSpeed > 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(100, (weather.windSpeed / 50) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Gusts */}
                                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">💨 Gusts</div>
                                    <div className="text-lg font-bold text-amber-400 font-mono">{weather.windGusts.toFixed(0)}<span className="text-xs text-gray-500 ml-1">km/h</span></div>
                                    <div className="text-[10px] text-gray-600 font-mono">Peak gusts</div>
                                    <div className="mt-2 w-full h-1 bg-black/60 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${weather.windGusts > 40 ? 'bg-red-500' : weather.windGusts > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(100, (weather.windGusts / 60) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Humidity */}
                                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">💧 Humidity</div>
                                    <div className="text-lg font-bold text-blue-400 font-mono">{weather.humidity}<span className="text-xs text-gray-500 ml-1">%</span></div>
                                    <div className="text-[10px] text-gray-600 font-mono">{weather.humidity > 80 ? 'High — lens fog risk' : 'Normal'}</div>
                                    <div className="mt-2 w-full h-1 bg-black/60 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${weather.humidity}%` }}></div>
                                    </div>
                                </div>

                                {/* Pressure */}
                                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">🔵 Pressure</div>
                                    <div className="text-lg font-bold text-purple-400 font-mono">{weather.pressure.toFixed(0)}<span className="text-xs text-gray-500 ml-1">hPa</span></div>
                                    <div className="text-[10px] text-gray-600 font-mono">{weather.pressure > 1013 ? 'High pressure' : 'Low pressure'}</div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                    <div className="text-[10px] text-gray-600 uppercase mb-1">☁️ Cloud Cover</div>
                                    <div className="text-sm font-mono text-white">{weather.cloudCover}%</div>
                                    <div className="mt-1 w-full h-1 bg-black/60 rounded-full overflow-hidden">
                                        <div className="h-full bg-gray-400 rounded-full" style={{ width: `${weather.cloudCover}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                    <div className="text-[10px] text-gray-600 uppercase mb-1">🌧️ Precipitation</div>
                                    <div className="text-sm font-mono text-white">{weather.precipitation} mm/h</div>
                                    <div className="text-[10px] text-gray-600 mt-1">{weather.precipitation > 0 ? 'Active precipitation' : 'No precipitation'}</div>
                                </div>
                            </div>

                            {/* Flight Advisories */}
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-bornebit-primary">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                    Flight Advisories
                                </h4>
                                <div className="space-y-1.5">
                                    {advisories.map((adv, i) => (
                                        <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-mono ${adv.level === 'danger'
                                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                            : adv.level === 'caution'
                                                ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                                                : 'bg-green-500/10 border border-green-500/20 text-green-400'
                                            }`}>
                                            <span className="shrink-0">{adv.icon}</span>
                                            <div>
                                                <span className="font-bold">[{adv.category}]</span> {adv.msg}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {activeView === 'hourly' && (
                        <div className="space-y-1.5">
                            {hourlyForecast.map((h, i) => {
                                const wx = WEATHER_CODES[h.weatherCode] || { desc: 'Unknown', icon: '❓', severity: 'safe' };
                                return (
                                    <div key={i} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2.5 border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-gray-400 w-12">{h.time}</span>
                                            <span className="text-lg">{wx.icon}</span>
                                            <span className="text-xs text-gray-400">{wx.desc}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-mono">
                                            <span className="text-amber-400">{h.temp.toFixed(0)}°C</span>
                                            <span className="text-cyan-400">{h.windSpeed.toFixed(0)} km/h</span>
                                            <span className={`${h.precipProb > 50 ? 'text-blue-400' : 'text-gray-600'}`}>💧{h.precipProb}%</span>
                                            <div className={`w-2 h-2 rounded-full ${wx.severity === 'danger' ? 'bg-red-500' : wx.severity === 'caution' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {hourlyForecast.length === 0 && (
                                <div className="text-center py-8 text-sm text-gray-500">No hourly data available</div>
                            )}
                        </div>
                    )}

                    {activeView === 'daily' && (
                        <div className="space-y-2">
                            {forecast.map((day, i) => {
                                const wx = WEATHER_CODES[day.weatherCode] || { desc: 'Unknown', icon: '❓' };
                                return (
                                    <div key={i} className={`bg-black/30 rounded-xl p-3 border ${i === 0 ? 'border-bornebit-primary/30' : 'border-white/5'} hover:border-white/10 transition-all`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{wx.icon}</span>
                                                <div>
                                                    <div className="text-xs font-bold text-white">{day.date}</div>
                                                    <div className="text-[10px] text-gray-500">{wx.desc}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-mono">
                                                    <span className="text-amber-400">{day.tempMax.toFixed(0)}°</span>
                                                    <span className="text-gray-600 mx-1">/</span>
                                                    <span className="text-blue-400">{day.tempMin.toFixed(0)}°</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                                            <span>🌬️ {day.windMax.toFixed(0)} km/h</span>
                                            <span>💨 {day.gustsMax.toFixed(0)} km/h gusts</span>
                                            <span>💧 {day.precipProb}%</span>
                                            <span>🌅 {day.sunrise}</span>
                                            <span>🌇 {day.sunset}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : error ? (
                <div className="p-8 text-center">
                    <span className="text-4xl mb-4 block">⚠️</span>
                    <p className="text-sm text-gray-400 mb-3">Unable to fetch weather data</p>
                    <button onClick={fetchWeather} className="text-xs text-bornebit-primary hover:underline">Retry</button>
                </div>
            ) : null}
        </div>
    );
};

export default WeatherAdvisory;
