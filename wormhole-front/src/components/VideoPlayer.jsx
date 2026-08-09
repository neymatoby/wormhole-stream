import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';

// Public demo HLS streams — reliable test sources
const DEMO_STREAMS = [
  'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
];

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  WORMHOLE STREAM — VideoPlayer v3.0 (Complete Rewrite)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Architecture: State Machine polling with deferred HLS.js initialization
 *
 *  Problem with v1/v2:
 *    - HLS.js was created immediately on mount, even when no stream existed
 *    - Each failed manifest fetch triggered HLS.js error → destroy → recreate cycle
 *    - With 15-20s timeouts, this meant 30-60s before the player gave up
 *    - Stale segments from Docker volume poisoned the playlist
 *
 *  Solution (v3):
 *    1. POLL first: lightweight HEAD/fetch to check if m3u8 exists
 *    2. Only create HLS.js AFTER we confirm segments are available
 *    3. Once live, aggressive recovery without destroying the instance
 *    4. Fast timeouts (5s manifest, 8s fragment) with rapid retries (500ms)
 *
 *  State Machine:
 *    DISCONNECTED → POLLING → CONNECTING → BUFFERING → LIVE → RECOVERING
 *                                                              ↓
 *                                                        DISCONNECTED (if stream ends)
 */

// ── Connection States ─────────────────────────────────────────────────
const STATE = {
  DISCONNECTED: 'disconnected',  // Initial / stream ended
  POLLING:      'polling',       // Checking if m3u8 exists (lightweight)
  CONNECTING:   'connecting',    // HLS.js loading manifest
  BUFFERING:    'buffering',     // Manifest loaded, buffering fragments
  LIVE:         'live',          // Playing live content
  RECOVERING:   'recovering',   // Temporary error, auto-recovering
  OFFLINE:      'offline',       // Max retries exceeded
};

export const VideoPlayer = ({ src, options = {}, onReady }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const pollTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const pollCountRef = useRef(0);
  const recoverCountRef = useRef(0);
  const hasEverBeenLiveRef = useRef(false);
  const mountedRef = useRef(true);

  const [state, setState] = useState(STATE.DISCONNECTED);
  const [message, setMessage] = useState('');
  const [activeSrc, setActiveSrc] = useState(src);
  const [usingDemo, setUsingDemo] = useState(false);
  const [needsUnmute, setNeedsUnmute] = useState(false);

  const POLL_INTERVAL = 2000;     // Check for stream every 2s
  const MAX_POLL_ATTEMPTS = 90;   // 3 minutes of polling before giving up
  const MAX_RECOVER_ATTEMPTS = 8; // Retries while recovering a live stream
  const MANIFEST_TIMEOUT = 5000;  // 5s — fail fast, retry fast
  const FRAG_TIMEOUT = 8000;      // 8s — generous for tunnel segments
  const RETRY_DELAY = 500;        // 500ms between retries

  // ── Cleanup ─────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hlsRef.current) {
      if (hlsRef.current._stallCheck) clearInterval(hlsRef.current._stallCheck);
      if (hlsRef.current._syncInterval) clearInterval(hlsRef.current._syncInterval);
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // ── Step 1: Poll for stream availability ────────────────────────────
  // Instead of creating HLS.js immediately, we do lightweight HEAD requests
  // to check if the m3u8 playlist exists. This avoids the expensive
  // HLS.js create/destroy cycle and gives instant feedback.
  const pollForStream = useCallback(() => {
    if (!mountedRef.current) return;

    pollCountRef.current++;
    setState(STATE.POLLING);
    setMessage(`Scanning for live stream... (${pollCountRef.current})`);

    // Try to fetch the m3u8 — if it returns valid content, the stream is live
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    fetch(activeSrc, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Bypass-Tunnel-Reminder': 'true',
      },
      cache: 'no-store',
    })
      .then(res => {
        clearTimeout(timeoutId);
        if (!mountedRef.current) return;

        if (res.ok) {
          return res.text().then(body => {
            // Verify it's actually a valid HLS playlist, not an error page
            if (body.includes('#EXTM3U') && body.includes('#EXTINF')) {
              // Stream is LIVE — segments exist!
              console.log('[Wormhole] Stream detected! Initializing player...');
              initHls();
            } else if (body.includes('#EXTM3U')) {
              // Playlist exists but no segments yet — stream just started
              console.log('[Wormhole] Playlist found but no segments yet, keep polling...');
              schedulePoll();
            } else {
              // Got a response but it's not HLS (could be tunnel splash page)
              console.log('[Wormhole] Non-HLS response, keep polling...');
              schedulePoll();
            }
          });
        } else if (res.status === 404) {
          // 404 = stream not started yet, this is normal
          schedulePoll();
        } else {
          // Other error (502, 503, etc) = server issue
          console.warn(`[Wormhole] Server returned ${res.status}, retrying...`);
          schedulePoll();
        }
      })
      .catch(err => {
        clearTimeout(timeoutId);
        if (!mountedRef.current) return;

        if (err.name === 'AbortError') {
          console.log('[Wormhole] Poll timeout, retrying...');
        } else {
          console.log('[Wormhole] Server unreachable, retrying...');
        }
        schedulePoll();
      });
  }, [activeSrc]);

  const schedulePoll = useCallback(() => {
    if (!mountedRef.current) return;

    if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
      setState(STATE.OFFLINE);
      setMessage('Stream server is unreachable after 3 minutes of polling.');
      return;
    }

    pollTimerRef.current = setTimeout(() => {
      if (mountedRef.current) pollForStream();
    }, POLL_INTERVAL);
  }, [pollForStream]);

  // ── Step 2: Initialize HLS.js (only after poll confirms stream exists) ──
  const initHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeSrc || !mountedRef.current) return;

    // Destroy any existing instance
    if (hlsRef.current) {
      if (hlsRef.current._stallCheck) clearInterval(hlsRef.current._stallCheck);
      if (hlsRef.current._syncInterval) clearInterval(hlsRef.current._syncInterval);
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setState(STATE.CONNECTING);
    setMessage('Connecting to stream...');

    // ── Native HLS (Safari / iOS) ─────────────────────────────────────
    if (!Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeSrc;
      video.addEventListener('loadedmetadata', () => {
        if (!mountedRef.current) return;
        hasEverBeenLiveRef.current = true;
        recoverCountRef.current = 0;
        setState(STATE.LIVE);
        setMessage('');
        // Try unmuted first, fall back to muted if autoplay blocked
        video.muted = false;
        video.play().catch(() => {
          video.muted = true;
          setNeedsUnmute(true);
          video.play().catch(() => {});
        });
        onReady && onReady(video);
      });
      video.addEventListener('error', () => {
        if (!mountedRef.current) return;
        // Fall back to polling
        setState(STATE.POLLING);
        pollForStream();
      });
      return;
    }

    if (!Hls.isSupported()) {
      setState(STATE.OFFLINE);
      setMessage('HLS is not supported in this browser.');
      return;
    }

    // ── HLS.js Configuration ──────────────────────────────────────────
    // Tuned for: 1s fragments, Cloudflare tunnel, low-latency live
    const hls = new Hls({
      // === Live edge sync ===
      // Start playback after 3 fragments (6s with 2s fragments) — more buffer runway
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 8,
      liveDurationInfinity: true,

      // === Buffer management ===
      // More buffer headroom reduces rebuffering over tunnel connections
      maxBufferLength: 15,
      maxMaxBufferLength: 30,
      maxBufferSize: 60 * 1000 * 1000, // 60MB
      maxBufferHole: 0.5,

      // === Low latency mode ===
      lowLatencyMode: true,
      enableWorker: true,
      backBufferLength: 15,

      // === Timeouts tuned for Cloudflare tunnel ===
      // Generous timeouts prevent premature failures on slow tunnel hops
      manifestLoadingTimeOut: MANIFEST_TIMEOUT,    // 5s
      manifestLoadingMaxRetry: 6,
      manifestLoadingRetryDelay: RETRY_DELAY,      // 500ms

      fragLoadingTimeOut: 12000,                   // 12s — generous for tunnel segments
      fragLoadingMaxRetry: 12,
      fragLoadingRetryDelay: RETRY_DELAY,          // 500ms

      levelLoadingTimeOut: MANIFEST_TIMEOUT,       // 5s
      levelLoadingMaxRetry: 6,
      levelLoadingRetryDelay: RETRY_DELAY,         // 500ms

      // Start from live edge
      startPosition: -1,

      // === Tunnel bypass headers ===
      xhrSetup: (xhr) => {
        xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
        xhr.setRequestHeader('Bypass-Tunnel-Reminder', 'true');
      },
    });

    hls.loadSource(activeSrc);
    hls.attachMedia(video);

    // ── Event: Manifest Parsed (stream is confirmed live) ─────────────
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (!mountedRef.current) return;
      console.log('[Wormhole] Manifest parsed — stream is LIVE');
      setState(STATE.BUFFERING);
      setMessage('Buffering...');
    });

    // ── Event: Fragment Buffered (first data received) ────────────────
    hls.on(Hls.Events.FRAG_BUFFERED, () => {
      if (!mountedRef.current) return;
      if (state === STATE.BUFFERING || !hasEverBeenLiveRef.current) {
        hasEverBeenLiveRef.current = true;
        recoverCountRef.current = 0;
        setState(STATE.LIVE);
        setMessage('');

        // Seek to live edge and play
        if (hls.liveSyncPosition != null) {
          video.currentTime = Math.max(0, hls.liveSyncPosition - 1);
        }
        // Try unmuted first, fall back to muted if autoplay blocked
        video.muted = false;
        video.play().catch(() => {
          // Autoplay with audio blocked — mute and try again
          video.muted = true;
          setNeedsUnmute(true);
          video.play().catch(() => {});
        });
        onReady && onReady(video);
      }
    });

    // ── Event: Error Handling ─────────────────────────────────────────
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!mountedRef.current) return;

      // Non-fatal errors: ignore silently
      if (!data.fatal) return;

      console.warn('[Wormhole] Fatal error:', data.type, data.details);

      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          if (hasEverBeenLiveRef.current) {
            // Was live — stream may have ended or temporary network blip
            recoverCountRef.current++;
            if (recoverCountRef.current >= MAX_RECOVER_ATTEMPTS) {
              // Stream probably ended
              console.log('[Wormhole] Stream appears to have ended, switching to polling');
              hls.destroy();
              hlsRef.current = null;
              hasEverBeenLiveRef.current = false;
              pollCountRef.current = 0;
              setState(STATE.POLLING);
              pollForStream();
            } else {
              // Try to recover without destroying
              setState(STATE.RECOVERING);
              setMessage(`Reconnecting... (${recoverCountRef.current}/${MAX_RECOVER_ATTEMPTS})`);
              hls.startLoad(-1);
            }
          } else {
            // Never went live — go back to polling
            console.log('[Wormhole] Connection failed, back to polling');
            hls.destroy();
            hlsRef.current = null;
            pollCountRef.current = 0;
            pollForStream();
          }
          break;

        case Hls.ErrorTypes.MEDIA_ERROR:
          console.warn('[Wormhole] Media error — attempting recovery');
          hls.recoverMediaError();
          break;

        default:
          if (hasEverBeenLiveRef.current) {
            // Was live — try silent reinit
            console.warn('[Wormhole] Unknown error while live — reinitializing');
            hls.destroy();
            hlsRef.current = null;
            retryTimerRef.current = setTimeout(() => {
              if (mountedRef.current) initHls();
            }, 1000);
          } else {
            // Never went live — back to polling
            hls.destroy();
            hlsRef.current = null;
            pollCountRef.current = 0;
            pollForStream();
          }
          break;
      }
    });

    // ── Stall Detection ───────────────────────────────────────────────
    // If video freezes for 4s while supposedly playing, seek to live edge
    let lastTime = 0;
    let stallCount = 0;
    const stallCheck = setInterval(() => {
      if (!mountedRef.current || !video || video.paused) {
        lastTime = 0;
        return;
      }
      if (video.currentTime === lastTime && lastTime > 0) {
        stallCount++;
        if (stallCount >= 1) { // 4 seconds of stall
          console.warn('[Wormhole] Stall detected — seeking to live edge');
          if (hls.liveSyncPosition != null) {
            video.currentTime = Math.max(0, hls.liveSyncPosition - 1);
          }
          hls.startLoad(-1);
          video.play().catch(() => {});
          stallCount = 0;
        }
      } else {
        stallCount = 0;
      }
      lastTime = video.currentTime;
    }, 4000);

    // ── Live Edge Drift Correction ────────────────────────────────────
    // If we fall more than 10s behind live edge, gently catch up
    const syncInterval = setInterval(() => {
      if (!mountedRef.current || !video || video.paused) return;
      if (hls.liveSyncPosition != null) {
        const drift = hls.liveSyncPosition - video.currentTime;
        if (drift > 15) {
          console.log(`[Wormhole] Drift ${drift.toFixed(1)}s — syncing to live edge`);
          video.currentTime = hls.liveSyncPosition - 3;
        }
      }
    }, 6000);

    hls._stallCheck = stallCheck;
    hls._syncInterval = syncInterval;
    hlsRef.current = hls;
  }, [activeSrc, onReady, pollForStream]);

  // ── Demo / Original source switching ────────────────────────────────
  const switchToDemo = useCallback(() => {
    cleanup();
    pollCountRef.current = 0;
    recoverCountRef.current = 0;
    hasEverBeenLiveRef.current = false;
    setActiveSrc(DEMO_STREAMS[0]);
    setUsingDemo(true);
    setState(STATE.CONNECTING);
    setMessage('Loading demo stream...');
  }, [cleanup]);

  const switchToOriginal = useCallback(() => {
    cleanup();
    pollCountRef.current = 0;
    recoverCountRef.current = 0;
    hasEverBeenLiveRef.current = false;
    setActiveSrc(src);
    setUsingDemo(false);
    setState(STATE.DISCONNECTED);
    setMessage('');
  }, [src, cleanup]);

  // ── Lifecycle: Start polling on mount / source change ───────────────
  useEffect(() => {
    mountedRef.current = true;
    hasEverBeenLiveRef.current = false;
    pollCountRef.current = 0;
    recoverCountRef.current = 0;

    // Start the state machine
    pollForStream();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [activeSrc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync activeSrc when parent prop changes
  useEffect(() => {
    if (!usingDemo) {
      setActiveSrc(src);
    }
  }, [src, usingDemo]);

  // ── Manual play click ───────────────────────────────────────────────
  const handlePlay = () => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;
    if (hls && hls.liveSyncPosition != null) {
      video.currentTime = hls.liveSyncPosition;
    }
    video.muted = false;
    setNeedsUnmute(false);
    video.play().catch(() => {});
  };

  // ── Unmute handler ──────────────────────────────────────────────────
  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setNeedsUnmute(false);
  };

  // ── Retry button ───────────────────────────────────────────────────
  const handleRetry = () => {
    cleanup();
    pollCountRef.current = 0;
    recoverCountRef.current = 0;
    hasEverBeenLiveRef.current = false;
    if (usingDemo) {
      switchToOriginal();
    } else {
      setState(STATE.DISCONNECTED);
      setMessage('');
      setTimeout(() => pollForStream(), 100);
    }
  };

  // ── Overlay visibility logic ────────────────────────────────────────
  const showOverlay = state !== STATE.LIVE && state !== STATE.RECOVERING;

  return (
    <div className="vjs-wormhole-wrapper" style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {/* Native HTML5 video element */}
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        controls
        playsInline
        autoPlay
        muted
        poster={options.poster || ''}
        onClick={handlePlay}
      />

      {/* ── Unmute Button (shown when autoplay required muting) ──── */}
      {needsUnmute && state === STATE.LIVE && (
        <button
          onClick={handleUnmute}
          style={{
            position: 'absolute', bottom: 56, right: 16,
            background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(8px)',
            border: 'none', borderRadius: 10, padding: '8px 16px',
            color: '#fff', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold',
            cursor: 'pointer', zIndex: 12,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
            animation: 'wh-pulse 2s ease-in-out infinite',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          TAP TO UNMUTE
        </button>
      )}

      {/* ── Status Overlay ────────────────────────────────────────── */}
      {showOverlay && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
          pointerEvents: state === STATE.OFFLINE ? 'auto' : 'none',
        }}>
          {/* POLLING / CONNECTING / BUFFERING */}
          {(state === STATE.POLLING || state === STATE.CONNECTING || state === STATE.BUFFERING) && (
            <>
              <div className="wh-spinner" />
              <p style={{
                color: state === STATE.POLLING ? '#F59E0B' : state === STATE.BUFFERING ? '#10B981' : '#4CC9F0',
                fontSize: 12, marginTop: 14, fontFamily: 'monospace', fontWeight: 'bold',
                letterSpacing: '0.1em',
              }}>
                {state === STATE.POLLING && 'SCANNING FOR LIVE STREAM...'}
                {state === STATE.CONNECTING && 'CONNECTING TO STREAM...'}
                {state === STATE.BUFFERING && 'BUFFERING...'}
              </p>
              {message && (
                <p style={{ color: '#6B7280', fontSize: 10, marginTop: 4, fontFamily: 'monospace' }}>
                  {message}
                </p>
              )}
              {state === STATE.POLLING && pollCountRef.current > 5 && (
                <p style={{ color: '#4B5563', fontSize: 9, marginTop: 8, fontFamily: 'monospace', maxWidth: 280, textAlign: 'center', lineHeight: 1.5 }}>
                  Make sure OBS is streaming to rtmp://localhost:1935/stream
                </p>
              )}
            </>
          )}

          {/* DISCONNECTED */}
          {state === STATE.DISCONNECTED && (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(107,114,128,0.15), rgba(107,114,128,0.05))',
                border: '1px solid rgba(107,114,128,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#6B7280" style={{ width: 28, height: 28 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                </svg>
              </div>
              <p style={{ color: '#9CA3AF', fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }}>
                STREAM IDLE
              </p>
              <p style={{ color: '#4B5563', fontSize: 10, fontFamily: 'monospace', marginTop: 4 }}>
                Waiting for connection...
              </p>
            </>
          )}

          {/* OFFLINE — max retries exceeded */}
          {state === STATE.OFFLINE && (
            <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 20px' }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(239,68,68,0.3)',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#EF4444" style={{ width: 32, height: 32 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <p style={{ color: '#EF4444', fontSize: 15, fontFamily: 'monospace', fontWeight: 'bold', marginBottom: 6 }}>
                STREAM OFFLINE
              </p>
              <p style={{ color: '#9CA3AF', fontSize: 11, fontFamily: 'monospace', marginBottom: 20, lineHeight: 1.5 }}>
                {message || 'The streaming server is not responding.'}
                {!usingDemo && ' This usually means the Cloudflare tunnel has expired or the RTMP server is stopped.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!usingDemo && (
                  <button
                    onClick={switchToDemo}
                    style={{
                      background: 'linear-gradient(135deg, rgba(76,201,240,0.2), rgba(114,9,183,0.2))',
                      border: '1px solid rgba(76,201,240,0.4)',
                      color: '#4CC9F0', padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { e.target.style.background = 'linear-gradient(135deg, rgba(76,201,240,0.3), rgba(114,9,183,0.3))'; }}
                    onMouseOut={(e) => { e.target.style.background = 'linear-gradient(135deg, rgba(76,201,240,0.2), rgba(114,9,183,0.2))'; }}
                  >
                    ▶ PLAY DEMO STREAM
                  </button>
                )}

                <button
                  onClick={handleRetry}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#9CA3AF', padding: '8px 20px', borderRadius: 10, cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: 11, transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#9CA3AF'; }}
                >
                  {usingDemo ? '↩ TRY ORIGINAL SOURCE' : '↻ RETRY CONNECTION'}
                </button>
              </div>

              <div style={{
                marginTop: 20, padding: 12, borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                textAlign: 'left',
              }}>
                <p style={{ color: '#6B7280', fontSize: 10, fontFamily: 'monospace', marginBottom: 6, fontWeight: 'bold' }}>
                  💡 TO RESTORE YOUR STREAM:
                </p>
                <p style={{ color: '#4B5563', fontSize: 9, fontFamily: 'monospace', lineHeight: 1.6 }}>
                  1. Start your RTMP server (Docker / NGINX)<br />
                  2. Run: <span style={{ color: '#4CC9F0' }}>node start-tunnel.mjs</span><br />
                  3. Copy new tunnel URL → Settings<br />
                  4. Start OBS streaming
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recovery Banner (shown while live, temporary issue) ───── */}
      {state === STATE.RECOVERING && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(245,158,11,0.15)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10, padding: '6px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 11, pointerEvents: 'none',
        }}>
          <div className="wh-spinner-sm" />
          <span style={{ color: '#F59E0B', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}>
            RECONNECTING...
          </span>
        </div>
      )}

      {/* ── Demo mode banner ─────────────────────────────────────── */}
      {usingDemo && hasEverBeenLiveRef.current && (
        <div style={{
          position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(76,201,240,0.15)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(76,201,240,0.3)',
          borderRadius: 10, padding: '6px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 11, pointerEvents: 'auto',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CC9F0', boxShadow: '0 0 8px #4CC9F0' }} />
          <span style={{ color: '#4CC9F0', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}>
            DEMO STREAM
          </span>
          <button
            onClick={switchToOriginal}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#9CA3AF', padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 9,
            }}
          >
            Switch to Live
          </button>
        </div>
      )}

      <style>{`
        .wh-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(76,201,240,0.2);
          border-top-color: #4CC9F0;
          border-radius: 50%;
          animation: wh-spin 0.8s linear infinite;
        }
        .wh-spinner-sm {
          width: 14px; height: 14px;
          border: 2px solid rgba(245,158,11,0.2);
          border-top-color: #F59E0B;
          border-radius: 50%;
          animation: wh-spin 0.6s linear infinite;
        }
        @keyframes wh-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes wh-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }
        .vjs-wormhole-wrapper video::-webkit-media-controls-panel {
          background: rgba(3,0,20,0.8) !important;
        }
      `}
      </style>
    </div>
  );
};

export default VideoPlayer;
