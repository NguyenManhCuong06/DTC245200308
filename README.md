# Hệ thống Thư viện Ảnh / Gallery - DevOps Final Project

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Docker Compose](https://img.shields.io/badge/Docker_Compose-v3.8-blue)](https://docs.docker.com/compose/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)](https://www.mysql.com/)
[![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-red)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboard-orange)](https://grafana.com/)
[![Loki](https://img.shields.io/badge/Loki-Logging-blue)](https://grafana.com/oss/loki/)

## 📋 Mô tả dự án

Hệ thống Thư viện Ảnh (Gallery) là một ứng dụng web full-stack cho phép người dùng:
- 📸 **Upload ảnh** - Tải lên ảnh từ thiết bị
- 📁 **Quản lý Album** - Tạo, chỉnh sửa, xóa album ảnh
- 🏷️ **Phân loại ảnh** - Tổ chức ảnh theo album
- 🔗 **Chia sẻ ảnh** - Tạo link chia sẻ công khai
- 🔐 **Đăng nhập/Phân quyền** - Hệ thống xác thực người dùng

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Nginx        │────▶│    Web App      │────▶│     MySQL       │
│  (Reverse Proxy)│     │  (Express.js)   │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Prometheus    │     │      Loki       │     │   phpMyAdmin    │
│  (Metrics)      │     │  (Logs)         │     │  (DB Tool)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────┐
│              Grafana (Dashboard)                │
└─────────────────────────────────────────────────┘
```

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ | Phiên bản |
|------------|-----------|-----------|
| Backend | Node.js + Express.js | 20 / 4.18 |
| Template Engine | EJS | 3.1 |
| Database | MySQL | 8.0 |
| DB Tool | phpMyAdmin | Latest |
| Reverse Proxy | Nginx | Alpine |
| Monitoring | Prometheus + Grafana | Latest |
| Logging | Loki + Promtail | Latest |
| Containerization | Docker + Docker Compose | 3.8 |
| Exporters | cAdvisor, node-exporter, mysqld-exporter | Latest |

## 🚀 Hướng dẫn chạy dự án

### Yêu cầu hệ thống
- Docker >= 20.10
- Docker Compose >= 2.0
- Git
- Tối thiểu 4GB RAM

### 1. Clone repository
```bash
git clone https://github.com/{{MSSV}}/{{MSSV}}-devops-final.git
cd {{MSSV}}-devops-final
```

### 2. Cấu hình môi trường
```bash
cp .env.example .env
# Chỉnh sửa file .env với mật khẩu bảo mật
```

### 3. Tạo SSL certificates (tự ký)
```bash
# Linux/macOS
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/C=VN/ST=HoChiMinh/L=HoChiMinh/O=GalleryProject/CN=localhost"

# Windows PowerShell
New-SelfSignedCertificate -Type SSLServerAuthentication -DnsName "localhost" `
  -FriendlyName "GalleryDevCert" -KeyLength 2048 -HashAlgorithm SHA256 `
  -NotAfter (Get-Date).AddYears(1)
```

### 4. Khởi động hệ thống
```bash
docker compose up -d --build
```

### 5. Kiểm tra trạng thái
```bash
docker compose ps
docker compose logs -f web
```

### 6. Truy cập các dịch vụ

| Dịch vụ | URL | Mô tả |
|---------|-----|-------|
| **Web App** | https://localhost | Ứng dụng chính (HTTPS) |
| **phpMyAdmin** | http://localhost:8080 | Quản lý database |
| **Grafana** | http://localhost:3000 | Dashboard monitoring |
| **Prometheus** | http://localhost:9090 | Metrics collection |
| **Loki** | http://localhost:3100 | Log aggregation |

**Tài khoản mặc định:**
- Grafana: `admin` / (xem trong `.env` - `GRAFANA_ADMIN_PASSWORD`)
- phpMyAdmin: user/password từ `.env` (`MYSQL_USER` / `MYSQL_PASSWORD`)

## 📁 Cấu trúc thư mục

```
{{MSSV}}-devops-final/
├── app/                    # Source code ứng dụng
│   ├── src/
│   │   ├── controllers/    # Xử lý logic nghiệp vụ
│   │   ├── routes/         # Định tuyến API
│   │   ├── middlewares/    # Middleware xác thực
│   │   ├── utils/          # Tiện ích
│   │   └── app.js          # Entry point
│   ├── views/              # EJS templates
│   ├── public/             # Static assets
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   ├── conf.d/
│   │   └── default.conf    # Nginx config
│   ├── certs/              # SSL certificates
│   └── logs/               # Nginx logs
├── prometheus/
│   └── prometheus.yml      # Prometheus config
├── grafana/
│   └── provisioning/       # Auto-provisioning
├── loki/
│   └── loki-config.yml     # Loki config
├── promtail/
│   └── promtail-config.yml # Promtail config
├── db/
│   └── init-scripts/       # SQL init scripts
├── docker-compose.yml      # Main orchestration
├── .env.example            # Environment template
└── README.md
```

## 🔐 Hardening & Security

1. **Non-root containers** - Tất cả container chạy với user non-root
2. **Network isolation** - 3 networks: frontend, backend, monitoring
3. **Secrets management** - Mật khẩu qua `.env`, không hard-code
4. **DB user restrictions** - User `app_user` chỉ có quyền cần thiết
5. **Security headers** - Nginx: X-Frame-Options, CSP, HSTS, etc.
6. **Capability dropping** - `cap_drop: ALL`, `no-new-privileges`
7. **Resource limits** - CPU/Memory limits cho từng container
8. **Rate limiting** - Nginx rate limit cho API và login
9. **Read-only filesystem** - Khi có thể áp dụng
10. **Health checks** - Tự động restart khi container unhealthy

## 📊 Monitoring & Logging

### Prometheus Targets
- `web:3000` - Web application metrics
- `db:3306` - MySQL (via mysqld-exporter:9104)
- `cadvisor:8080` - Container metrics
- `node-exporter:9100` - Host metrics
- `prometheus:9090` - Self-monitoring

### Grafana Dashboards (Auto-provisioned)
- **Container Monitoring** - CPU, Memory, Network
- **Web Application** - Request rate, Response time, Errors
- **MySQL Database** - Connections, Queries, Slow queries

### Loki Log Queries (LogQL)
```logql
# Lỗi ứng dụng web
{container="web"} |= "error"

# Lỗi Nginx 5xx
{container="nginx"} | json | status >= 500

# Tỷ lệ log theo container
sum by (container) (rate({job="docker"}[5m]))
```

## 🔧 Các lệnh hữu ích

```bash
# Xem logs
docker compose logs -f [service_name]

# Restart service
docker compose restart [service_name]

# Rebuild và restart
docker compose up -d --build [service_name]

# Xem trạng thái container
docker compose ps

# Xóa toàn bộ (data sẽ mất)
docker compose down -v

# Backup database
docker compose exec db mysqldump -u root -p gallery_db > backup.sql

# Restore database
docker compose exec -T db mysql -u root -p gallery_db < backup.sql
```

## 📝 API Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/` | Trang chủ | No |
| GET | `/login` | Đăng nhập | No |
| POST | `/login` | Xử lý đăng nhập | No |
| GET | `/register` | Đăng ký | No |
| POST | `/register` | Xử lý đăng ký | No |
| GET | `/logout` | Đăng xuất | Yes |
| GET | `/albums` | Danh sách album | No |
| POST | `/albums` | Tạo album mới | Yes |
| GET | `/albums/:id` | Chi tiết album | No |
| DELETE | `/albums/:id` | Xóa album | Yes (owner) |
| GET | `/photos` | Danh sách ảnh | No |
| POST | `/photos/upload` | Upload ảnh | Yes |
| GET | `/photos/:id` | Chi tiết ảnh | No |
| GET | `/photos/:id/share` | Link chia sẻ | No |
| GET | `/health` | Health check | No |
| GET | `/api/health` | API health check | No |
| GET | `/api/albums` | API danh sách album | No |
| GET | `/api/photos` | API danh sách ảnh | No |

## 🐛 Troubleshooting

### Container không start được
```bash
docker compose logs [service_name]
docker compose ps
```

### Database connection failed
```bash
# Kiểm tra db healthy
docker compose exec db mysqladmin ping -h localhost

# Kiểm tra biến môi trường
docker compose exec web env | grep DB
```

### Prometheus targets DOWN
```bash
# Kiểm tra network
docker network inspect {{MSSV}}-devops-final_monitoring

# Kiểm tra target config
curl http://localhost:9090/api/v1/targets
```

### Loki không có log
```bash
# Kiểm tra promtail config
docker compose logs promtail

# Kiểm tra loki
curl http://localhost:3100/ready
```

### HTTPS không hoạt động
```bash
# Kiểm tra certificates
ls -la nginx/certs/

# Kiểm tra nginx config
docker compose exec nginx nginx -t
```

## 📄 Báo cáo

Xem báo cáo chi tiết tại: [`docs/report.md`](docs/report.md)

## 👨‍💻 Thông tin sinh viên

- **Họ tên:** {{HỌ_TÊN}}
- **MSSV:** {{MSSV}}
- **Lớp:** {{LỚP}}
- **Môn học:** {{MÔN_HỌC}}
- **GVHD:** {{GVHD}}
- **Trường/Khoa:** {{TRƯỜNG_KHOA}}

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

**Lưu ý:** Đây là dự án đồ án môn học. Không sử dụng cho môi trường production thực tế mà không có các biện pháp bảo mật bổ sung.