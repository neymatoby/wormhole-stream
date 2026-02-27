import React, { useRef, useEffect } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export const VideoPlayer = ({ src, options, onReady }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode. 
      const videoElement = document.createElement("video-js");

      videoElement.classList.add('vjs-big-play-centered', 'vjs-wormhole');
      videoRef.current.appendChild(videoElement);

      // Hook into VHS (Video.js HTTP Streaming) to add headers for Ngrok
      // This is critical for free Ngrok tunnels which show a warning page otherwise.
      if (videojs.Vhs) {
        // Use onRequest as beforeRequest is deprecated
        videojs.Vhs.xhr.onRequest = (options) => {
          options.headers = options.headers || {};
          options.headers['ngrok-skip-browser-warning'] = 'true';
          return options;
        };
      }

      const player = playerRef.current = videojs(videoElement, {
        ...options,
        sources: [{
          src: src,
          type: 'application/x-mpegURL'
        }],
        html5: {
          vhs: {
            overrideNative: true, // Force usage of VHS to ensure headers are sent
          }
        }
      }, () => {
        videojs.log('player is ready');
        onReady && onReady(player);
      });

    } else {
      const player = playerRef.current;
      player.src({ src: src, type: 'application/x-mpegURL' });
    }
  }, [options, videoRef, src, onReady]);

  // Dispose the player on unmount
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} className="w-full h-full rounded-xl overflow-hidden shadow-2xl shadow-wormhole-primary/20 border border-wormhole-primary/30" />
      <style>{`
        .vjs-wormhole .vjs-control-bar {
          background-color: rgba(3, 0, 20, 0.8) !important;
          backdrop-filter: blur(10px);
        }
        .vjs-wormhole .vjs-big-play-button {
          background-color: rgba(123, 44, 191, 0.8) !important;
          border-color: #4CC9F0 !important;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          line-height: 80px;
          transition: all 0.3s ease;
        }
        .vjs-wormhole .vjs-big-play-button:hover {
          background-color: #F72585 !important;
          transform: scale(1.1);
        }
        .vjs-wormhole .vjs-play-progress {
          background-color: #4CC9F0 !important;
        }
        .vjs-wormhole .vjs-slider {
          background-color: rgba(255,255,255,0.1) !important;
        }
      `}</style>
    </div>
  );
}

export default VideoPlayer;
