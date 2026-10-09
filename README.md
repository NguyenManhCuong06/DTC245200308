# Hệ thống Thư viện Ảnh / Gallery

Stack triển khai cho đề 31 bằng Docker Compose: ứng dụng Node.js/Express, MySQL,
phpMyAdmin, Nginx HTTPS, Prometheus, Grafana, exporters, Loki và Promtail.

## Công nghệ và dịch vụ

| Thành phần | Image / công nghệ |
|---|---|
| Web | Node.js 20.20.2 Alpine, Express, EJS |
| Database | MySQL 8.0.46 |
| DB UI | phpMyAdmin 5.2.3 |
| Reverse proxy | Nginx 1.31.6 Alpine |
| Metrics | Prometheus 3.15.0, Grafana Enterprise 13.2.3 |
| Exporters | cAdvisor 0.55.1, node-exporter 1.12.1, mysqld-exporter 0.20.0, nginx-prometheus-exporter 1.4.2 |
| Logging | Loki 3.7.8, Promtail 3.6.8 |

## Chạy lần đầu

Yêu cầu Docker Desktop với WSL 2 (Windows) hoặc Docker Engine và Docker Compose
plugin trên Linux.

```bash
git clone https://github.com/NguyenManhCuong06/DTC245200308.git
cd DTC245200308
cp .env.example .env
```

Trên PowerShell, thay các giá trị `replace_with_...` trong `.env` bằng các chuỗi
hex ngẫu nhiên riêng biệt (mỗi giá trị 64 ký tự). Có thể tạo chuỗi bằng:

```powershell
openssl rand -hex 32
```

Không dùng các giá trị mẫu trên môi trường dùng chung hoặc public. File `.env`
không được đưa vào Git. Sau đó chạy:

```bash
docker compose up -d --build
docker compose ps
```

Chứng thư self-signed cho `localhost` được Nginx tự tạo lần đầu và lưu trong
volume `nginx_certs`. Trình duyệt cảnh báo chứng thư không được CA tin cậy là
bình thường trong môi trường phát triển.

## Truy cập

| Thành phần | Địa chỉ | Phạm vi |
|---|---|---|
| Gallery | `https://localhost` | Nginx HTTPS, host ports 443/80 |
| phpMyAdmin | `https://localhost/phpmyadmin/` | Qua Nginx HTTPS; đăng nhập bằng `MYSQL_USER` và `MYSQL_PASSWORD` |
| Grafana | `http://localhost:3000` | Chỉ bind loopback; user `admin`, mật khẩu `GRAFANA_ADMIN_PASSWORD` |
| Prometheus | `http://localhost:9090` | Chỉ bind loopback |
| Loki API | `http://localhost:3100` | Chỉ bind loopback |
| Exporter endpoints | `localhost:9100`, `:9104`, `:9113` | Chỉ bind loopback |

Từ máy khác, các cổng monitoring không được publish ra LAN; dùng SSH port
forwarding tới `127.0.0.1` trên máy host. Không mở trực tiếp MySQL ra host.

## Monitoring

Prometheus scrape targets:

- `web:3000/metrics`
- `mysqld-exporter:9104/metrics`
- `cadvisor:8080/metrics`
- `node-exporter:9100/metrics`
- `nginx-prometheus-exporter:9113/metrics`
- `prometheus:9090/metrics`

Grafana tự provision dashboards cho container, ứng dụng web, Nginx và MySQL.
MySQL exporter dùng tài khoản riêng `gallery_exporter`; ứng dụng kết nối bằng
`MYSQL_USER`, không dùng MySQL root.

## LogQL

Promtail lấy Docker container logs qua Docker socket (chỉ container của Compose
project `gallery`) và tail file JSON của ứng dụng tại `app/src/logs`. Nhãn Docker gồm `container`, `service`, `stream`.
Có thể chạy các truy vấn trong Grafana → Explore → Loki:

```logql
{container="nginx"}
{container="nginx"} |= "error"
{service=~"web|nginx"} |~ "(?i)(error|warn|fail)"
```

Các query chỉ trả log trong khoảng thời gian đang chọn và sau khi có request/log
tương ứng.

## Hardening trong cấu hình

- Ứng dụng chạy user `node`; Nginx chạy user `nginx` và lắng nghe cổng không privileged trong container.
- MySQL không publish port ra host; DB network được khai báo internal.
- Prometheus, Grafana, Loki và exporter ports được bind vào `127.0.0.1`.
- Mật khẩu cấu hình qua `.env`; init script cấp CRUD trên schema ứng dụng và quyền metrics riêng cho exporter.
- Web và Nginx dùng filesystem read-only, tmpfs cho thư mục tạm; một số service drop capabilities và cấm privilege escalation.
- Nginx có HTTPS self-signed, HSTS, security headers và rate limits.
- Compose đặt giới hạn CPU/RAM và healthcheck cho các service có health endpoint/tool phù hợp.

Không coi chứng thư self-signed hay mật khẩu phát triển là cấu hình production.

## Vận hành

```bash
docker compose logs -f web
docker compose logs -f promtail loki
docker compose restart web
```

`docker compose down` giữ các named volumes. `docker compose down -v` xóa database,
uploads nội bộ và dữ liệu Grafana/Prometheus/Loki; chỉ dùng khi chủ động muốn làm
sạch dữ liệu.
