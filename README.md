# Hệ thống Thư viện Ảnh / Gallery

Stack triển khai cho đề 31 bằng Docker Compose: ứng dụng Node.js/Express, MySQL,
phpMyAdmin, Nginx HTTPS, Prometheus, Grafana, exporters, Loki và Promtail.

## Công nghệ và dịch vụ

| Thành phần | Image / công nghệ |
|---|---|
| Web | Node.js 20.20.2 Alpine, Express, EJS |
| Database | MySQL 8.0.46 |
| DB UI | phpMyAdmin 5.2.3 |
| Reverse proxy | Nginx unprivileged 1.31.6 Alpine |
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

Seed dữ liệu demo (3 tài khoản, 5 album, 25 ảnh và tag) bằng lệnh sau:

```bash
docker compose exec -T web node /app/db/init-scripts/seed-demo.js
```

`UPLOAD_DIR` được cấu hình tới thư mục uploads dùng chung. Nếu thiếu
`DEMO_ADMIN_PASSWORD` hoặc `DEMO_USER_PASSWORD`, seed tự sinh mật khẩu ngẫu
nhiên mạnh và chỉ in mỗi mật khẩu một lần.

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
{container="web"}
{container="nginx"} |= " 404 "
{container="nginx"} |~ "(?i)error|warn"
{job="application"} | json | status_code=~"4..|5.."
sum(count_over_time({job="application"}[5m]))
```

Các query chỉ trả log trong khoảng thời gian đang chọn và sau khi có request/log
tương ứng.

Đã thêm dashboard **Gallery Logs** trong Grafana với truy vấn container/Nginx,
lọc log ứng dụng mức error/warn hoặc status 4xx/5xx và thống kê số dòng 5 phút.

Đã chạy request đăng ký, đăng nhập, tạo/mở album, `/gd3-not-a-route` (404) và
`/admin` bằng tài khoản user thường (403), sau đó gọi Loki
`/loki/api/v1/query_range` (09-10-2026, khoảng 15 phút gần nhất):

| LogQL | Kết quả thực |
|---|---:|
| `{container="web"}` | 1,000 dòng (đạt giới hạn `limit=1000` của truy vấn) |
| `{container="nginx"} \|= " 404 "` | 4 dòng |
| `{container="nginx"} \|~ "(?i)error\|warn"` | 1 dòng |
| `{job="application"} \| json \| status_code=~"4..|5.."` | 104 dòng |
| `sum(count_over_time({job="application"}[5m]))` | 1 sample, giá trị 55 |

Các số liệu là snapshot tại thời điểm kiểm tra; chúng phụ thuộc thời gian lưu
trữ log và lượng request.

## Hardening trong cấu hình

- Ứng dụng chạy user `node`; Nginx unprivileged chạy user `nginx` (UID 101), lắng nghe 8080/8443 trong container và publish 80/443.
- MySQL không publish port ra host; DB network được khai báo internal.
- Prometheus, Grafana, Loki và exporter ports được bind vào `127.0.0.1`.
- Credential được truyền qua `.env`; MySQL root chỉ được tạo cho `localhost`; app user chỉ có SELECT/INSERT/UPDATE/DELETE trên schema gallery và exporter có tài khoản riêng.
- Web và Nginx dùng filesystem read-only, tmpfs cho vùng ghi; web, Nginx, metrics/logging services thả Linux capabilities và tắt privilege escalation.
- Prometheus, Loki, Promtail, cAdvisor và exporters dùng filesystem read-only khi có volume/tmpfs phù hợp. Grafana giữ root filesystem writable: image Enterprise tự cập nhật plugin bundled lúc khởi động; thử read-only làm plugin registry không đăng ký datasource.
- Nginx có HTTPS self-signed, HTTP→HTTPS, HSTS, security headers, giới hạn request body 105 MiB và rate limit riêng cho `/login` và `/register` (5 request/phút + burst 5).
- Loki, Promtail và Nginx exporter dùng static HTTP readiness probe do image upstream không có shell/curl; các probe kiểm tra `/ready` hoặc `/metrics`.
- Web chỉ khởi động sau healthcheck MySQL qua TCP loopback (không chỉ kiểm tra Unix socket), tránh đánh dấu DB sẵn sàng trước khi cổng ứng dụng chấp nhận kết nối.
- Promtail và cAdvisor cần root: Promtail để đọc Docker socket/JSON logs; cAdvisor để thu metrics từ filesystem và socket của host. MySQL entrypoint khởi tạo dưới root rồi daemon chạy UID 999; phpMyAdmin Apache master chạy root để bind cổng 80, worker chạy `www-data`.
- `express-session` dùng MemoryStore mặc định; phiên đăng nhập không tồn tại sau khi web restart. `node-exporter` quan sát máy ảo Linux WSL 2, không phải toàn bộ tài nguyên Windows host.
- Các image base và custom image đều được gắn version cụ thể; Compose đặt giới hạn CPU/RAM và healthcheck cho toàn bộ service.

Không coi chứng thư self-signed hay mật khẩu phát triển là cấu hình production.

## Vận hành

```bash
docker compose logs -f web
docker compose logs -f promtail loki
docker compose restart web
```

`docker compose down` giữ các named volumes. `docker compose down -v` xóa database
và dữ liệu Grafana/Prometheus/Loki; các thư mục uploads và application logs được
bind-mount từ `app/public/uploads` và `app/src/logs` nên vẫn còn trên host.
Chỉ dùng `down -v` khi chủ động muốn làm sạch dữ liệu trong named volumes.
