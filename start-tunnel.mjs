import { tunnel } from 'cloudflared';

console.log('Starting Cloudflare Tunnel to http://localhost:8080...');

const { url, connections, child, stop } = tunnel({ '--url': 'http://localhost:8080' });

url.then((u) => {
    console.log('\n========================================');
    console.log('🚀 CLOUDFLARE TUNNEL IS LIVE!');
    console.log(`📡 Public URL: ${u}`);
    console.log(`📺 Stream URL: ${u}/hls/test.m3u8`);
    console.log('========================================\n');
    console.log('Press Ctrl+C to stop the tunnel.');
});

connections.then((c) => {
    console.log('Tunnel connections established:', c);
});

process.on('SIGINT', () => {
    console.log('\nStopping tunnel...');
    stop();
    process.exit(0);
});
