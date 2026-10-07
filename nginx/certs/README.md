# Self-signed Certificate Information
# This file is a placeholder. In a real setup, you need to generate SSL certificates.
# 
# To generate self-signed certificates on Linux/macOS:
#   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#     -keyout selfsigned.key -out selfsigned.crt \
#     -subj "/C=VN/ST=HoChiMinh/L=HoChiMinh/O=GalleryProject/CN=localhost"
#
# To generate self-signed certificates on Windows (PowerShell):
#   New-SelfSignedCertificate -Type SSLServerAuthentication -DnsName "localhost" -FriendlyName "GalleryDevCert" `
#     -CertConfig .\selfsigned.pfx -KeyLength 2048 -KeyAlgorithm RSA -HashAlgorithm SHA256 `
#     -NotAfter (Get-Date).AddYears(1)
#
# After generating, rename/copy the files to:
#   - selfsigned.crt (certificate file)
#   - selfsigned.key (private key file)
#
# Note: For production, use Let's Encrypt certificates instead of self-signed ones.