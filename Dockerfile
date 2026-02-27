FROM alfg/nginx-rtmp

# Copy our custom nginx config directly as the final config
COPY nginx_custom.conf /etc/nginx/nginx.conf

# Copy frontend app
COPY www/app /www/static/app

# Override the default CMD to skip envsubst (which would overwrite our config)
CMD ["nginx"]
