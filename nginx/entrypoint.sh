#!/bin/sh
set -eu

mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

if [ ! -s /etc/nginx/certs/selfsigned.crt ] || [ ! -s /etc/nginx/certs/selfsigned.key ]; then
  umask 077
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/selfsigned.key \
    -out /etc/nginx/certs/selfsigned.crt \
    -subj "/C=VN/O=Gallery Development/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
fi

exec nginx -g 'daemon off;'