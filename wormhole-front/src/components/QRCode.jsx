import React, { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  WORMHOLE STREAM — QR Code Share Component
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Generates a scannable QR code for the current public streaming URL.
 *  Auto-updates whenever the URL prop changes (e.g. new Cloudflare tunnel).
 *
 *  Uses the `qrcode` npm package to render to a Canvas element,
 *  then styled to match the Wormhole dark theme.
 */

const StreamQRCode = ({ url, label = 'Public Stream URL' }) => {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !url) return;

    setError(null);

    QRCode.toCanvas(canvasRef.current, url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#FF7043',   // Wormhole orange for the QR modules
        light: '#0a0a1a',  // Dark background matching the app
      },
      errorCorrectionLevel: 'M',
    })
      .catch((err) => {
        console.error('[QRCode] Generation failed:', err);
        setError('Failed to generate QR code');
      });
  }, [url]);

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'wormhole-stream-qr.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  if (!url) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', color: '#6B7280',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
      }}>
        No stream URL configured
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, padding: '8px 0',
    }}>
      {/* QR Code Canvas */}
      <div style={{
        position: 'relative',
        borderRadius: 20,
        padding: 16,
        background: 'linear-gradient(135deg, rgba(255,112,67,0.06), rgba(139,92,246,0.04))',
        border: '1px solid rgba(255,112,67,0.15)',
        boxShadow: '0 0 40px rgba(255,87,34,0.06), inset 0 1px 0 rgba(255,255,255,0.02)',
      }}>
        {/* Corner accent dots */}
        <div style={{
          position: 'absolute', top: 8, left: 8, width: 4, height: 4,
          borderRadius: '50%', background: '#FF7043', opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', top: 8, right: 8, width: 4, height: 4,
          borderRadius: '50%', background: '#FF7043', opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', bottom: 8, left: 8, width: 4, height: 4,
          borderRadius: '50%', background: '#FF7043', opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', bottom: 8, right: 8, width: 4, height: 4,
          borderRadius: '50%', background: '#FF7043', opacity: 0.5,
        }} />

        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            borderRadius: 12,
            imageRendering: 'pixelated',
          }}
        />

        {/* Scan indicator */}
        <div style={{
          position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
          background: '#0a0a1a', padding: '2px 10px', borderRadius: 8,
          border: '1px solid rgba(255,112,67,0.2)',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, color: '#FF7043', fontWeight: 'bold',
            letterSpacing: '0.15em',
          }}>
            SCAN ME
          </span>
        </div>
      </div>

      {error && (
        <p style={{
          color: '#EF4444', fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {error}
        </p>
      )}

      {/* Label */}
      <div style={{ textAlign: 'center', maxWidth: 280 }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: '#6B7280', fontWeight: 'bold',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          {label}
        </p>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: 'rgba(255,112,67,0.7)',
          wordBreak: 'break-all', lineHeight: 1.5,
        }}>
          {url}
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: copied
              ? 'rgba(52,211,153,0.15)'
              : 'rgba(255,112,67,0.1)',
            border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(255,112,67,0.2)'}`,
            borderRadius: 12, padding: '8px 16px',
            color: copied ? '#34D399' : '#FF7043',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 'bold', cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.05em',
          }}
          onMouseOver={(e) => {
            if (!copied) {
              e.currentTarget.style.background = 'rgba(255,112,67,0.18)';
              e.currentTarget.style.borderColor = 'rgba(255,112,67,0.35)';
            }
          }}
          onMouseOut={(e) => {
            if (!copied) {
              e.currentTarget.style.background = 'rgba(255,112,67,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,112,67,0.2)';
            }
          }}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              COPIED
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              COPY LINK
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 12, padding: '8px 16px',
            color: '#A78BFA',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 'bold', cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.05em',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.18)';
            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          SAVE QR
        </button>
      </div>
    </div>
  );
};

export default StreamQRCode;
