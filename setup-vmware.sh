#!/bin/bash
# setup-vmware.sh - Tự động cài đặt Gallery stack trên Ubuntu VM
# Chạy: curl -fsSL https://raw.githubusercontent.com/NguyenManhCuong06/DTC245200308/main/setup-vmware.sh | bash
# Hoặc: chmod +x setup-vmware.sh && ./setup-vmware.sh

set -e

echo "=== Gallery Stack Setup for Ubuntu VM ==="

# Kiểm tra root
if [[ $EUID -eq 0 ]]; then
   echo "Không chạy với sudo/root. Chạy user thường."
   exit 1
fi

# Update system
echo "[1/6] Update system..."
sudo apt update && sudo apt upgrade -y

# Cài Docker
echo "[2/6] Cài Docker..."
sudo apt install -y docker.io docker-compose-plugin git curl openssl

# Cấu hình user
echo "[3/6] Cấu hình user docker..."
sudo usermod -aG docker $USER

# Clone repo
echo "[4/6] Clone repository..."
cd ~
if [ -d "DTC245200308" ]; then
    echo "Repo đã tồn tại, pull latest..."
    cd DTC245200308 && git pull
else
    git clone https://github.com/NguyenManhCuong06/DTC245200308.git
    cd DTC245200308
fi

# Generate private development credentials without printing them.
if [ ! -f .env ]; then
    echo "[5/6] Tạo .env với mật khẩu ngẫu nhiên..."
    umask 077
    cat > .env <<EOF
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 32)
MYSQL_DATABASE=gallery_db
MYSQL_USER=app_user
MYSQL_PASSWORD=$(openssl rand -hex 32)
MYSQL_EXPORTER_PASSWORD=$(openssl rand -hex 32)
GRAFANA_ADMIN_PASSWORD=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
EOF
fi

# Khởi động stack
echo "[6/6] Khởi động Docker Compose..."
docker compose up -d

# Đợi services healthy
echo "Đợi services khởi động..."
sleep 15

# Kiểm tra
echo "=== Kiểm tra services ==="
docker compose ps

echo ""
echo "=== Kiểm tra endpoints ==="
curl -k https://localhost/health 2>/dev/null || echo "Gallery: Đang khởi động..."
curl -s http://localhost:9090/-/healthy 2>/dev/null && echo "Prometheus: OK"
curl -s http://localhost:3000/api/health 2>/dev/null && echo "Grafana: OK"
curl -s http://localhost:3100/ready 2>/dev/null && echo "Loki: OK"

# Lấy IP
VM_IP=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)

echo ""
echo "=== SETUP HOÀN TẤT ==="
echo "Gallery:    https://$VM_IP (hoặc https://localhost trong VM)"
echo "phpMyAdmin: https://$VM_IP/phpmyadmin/ (đăng nhập bằng MYSQL_USER trong .env)"
echo "Grafana, Prometheus, Loki: chỉ truy cập localhost trong VM."
echo "Từ máy host, dùng SSH tunnel đến các cổng 3000, 9090, 3100 nếu cần."
echo ""
echo "Lưu ý: Cần logout/login hoặc chạy 'newgrp docker' để dùng docker không sudo"
echo "Truy cập từ host Windows: dùng IP $VM_IP thay vì localhost"