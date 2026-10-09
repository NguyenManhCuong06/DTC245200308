FROM nginx:1.31.6-alpine

RUN apk add --no-cache curl openssl

RUN mkdir -p /var/cache/nginx /var/run/nginx /etc/nginx/certs \
    /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
    && chown -R nginx:nginx /var/cache/nginx /var/run/nginx /etc/nginx/certs /tmp

COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod 0555 /entrypoint.sh

USER nginx

EXPOSE 8080 8443 8081

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]