# Development TLS certificate

The Nginx entrypoint generates a self-signed certificate for `localhost` on
first startup and stores it in the Compose-managed `nginx_certs` volume.
Certificate and private-key files are intentionally excluded from Git.

Browsers will show a trust warning because the certificate is self-signed.
Do not use this development certificate for a public production deployment.
