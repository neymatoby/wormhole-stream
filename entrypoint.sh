#!/bin/sh
# Wormhole Stream — Container Entrypoint
# Cleans stale HLS segments from previous sessions to prevent
# the player from loading old/corrupt data on startup.

echo "=== Wormhole Stream Starting ==="
echo "Cleaning stale HLS segments..."

# Remove ALL old HLS data — fresh start every time
rm -rf /opt/data/hls/*
mkdir -p /opt/data/hls

echo "HLS directory cleaned. Starting NGINX..."

# Start NGINX (daemon off is set in config, so this blocks)
exec nginx
