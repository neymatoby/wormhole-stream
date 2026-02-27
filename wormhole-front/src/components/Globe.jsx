import createGlobe from 'cobe'
import { useEffect, useRef } from 'react'

// Night Map Globe - Earth with city lights
export function Globe({ size = 600, isBackground = false }) {
    const canvasRef = useRef();

    useEffect(() => {
        let phi = 0;
        let width = isBackground ? window.innerWidth : size * 2;
        let height = isBackground ? window.innerHeight : size * 2;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: width,
            height: height,
            phi: 0,
            theta: 0.3, // Slight tilt for better view
            dark: 1, // Full dark mode - night time
            diffuse: 0.4, // Lower diffuse for night look
            mapSamples: 24000, // Higher samples for detailed city lights
            mapBrightness: 12, // Bright city lights
            baseColor: [0.02, 0.02, 0.05], // Very dark blue-black (ocean at night)
            markerColor: [1, 0.34, 0.13], // Bornebit Orange (#FF5722)
            glowColor: [0.05, 0.05, 0.15], // Subtle blue atmospheric glow
            markers: [
                // Major cities with glowing markers
                { location: [37.7595, -122.4367], size: 0.06 }, // San Francisco
                { location: [40.7128, -74.0060], size: 0.1 }, // NYC
                { location: [51.5074, -0.1278], size: 0.08 }, // London
                { location: [35.6762, 139.6503], size: 0.08 }, // Tokyo
                { location: [22.3193, 114.1694], size: 0.07 }, // Hong Kong
                { location: [1.3521, 103.8198], size: 0.06 }, // Singapore
                { location: [25.2048, 55.2708], size: 0.07 }, // Dubai
                { location: [-33.8688, 151.2093], size: 0.06 }, // Sydney
                { location: [6.5244, 3.3792], size: 0.05 }, // Lagos
                { location: [9.0820, 7.4951], size: 0.04 }, // Abuja
            ],
            onRender: (state) => {
                state.phi = phi
                phi += 0.003 // Slower, smoother rotation for night view
                state.width = width;
                state.height = height;
            },
        })

        // Handle resize for background mode
        const handleResize = () => {
            if (isBackground) {
                width = window.innerWidth;
                height = window.innerHeight;
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            globe.destroy()
            window.removeEventListener('resize', handleResize);
        }
    }, [size, isBackground])

    if (isBackground) {
        return (
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <canvas
                    ref={canvasRef}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
                    style={{
                        width: '150vmax',
                        height: '150vmax',
                        minWidth: '100vw',
                        minHeight: '100vh'
                    }}
                />
                {/* Gradient overlay for better content readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            </div>
        )
    }

    return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <canvas
                ref={canvasRef}
                style={{ width: size, height: size, maxWidth: '100%', aspectRatio: '1' }}
                className="opacity-90 hover:opacity-100 transition-opacity duration-500"
            />
        </div>
    )
}
