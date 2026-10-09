#!/bin/sh
curl -s -G "http://loki:3100/loki/api/v1/query_range" \
  --data-urlencode "query={container=\"nginx\"}" \
  --data-urlencode "limit=5"