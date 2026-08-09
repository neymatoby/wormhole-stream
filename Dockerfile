FROM alfg/nginx-rtmp

# Copy our custom nginx config directly as the final config
COPY nginx_custom.conf /etc/nginx/nginx.conf

# Copy startup script that cleans stale HLS data before launching
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy frontend app
COPY www/app /www/static/app

# Use our entrypoint that cleans old segments first
ENTRYPOINT ["/entrypoint.sh"]
