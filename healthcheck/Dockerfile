ARG BASE_IMAGE=grafana/loki:3.7.8

FROM golang:1.26.1-alpine AS probe
WORKDIR /src
COPY healthcheck/http-probe.go .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /gallery-healthcheck http-probe.go

FROM ${BASE_IMAGE}
COPY --from=probe /gallery-healthcheck /usr/local/bin/gallery-healthcheck
