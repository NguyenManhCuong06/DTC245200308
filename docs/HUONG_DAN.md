# Hướng dẫn triển khai và vận hành — Đề tài 31: Hệ thống Thư viện Ảnh (Gallery)

Tài liệu này hướng dẫn từng bước cài đặt, kiểm tra và vận hành hệ thống Gallery trên Docker Compose. Toàn bộ số liệu và lệnh trong tài liệu đã được chạy thực tế trên môi trường Windows 11 + Docker Desktop (WSL 2) ngày 23-10-2026.

## 1. Phạm vi và yêu cầu

- Hệ điều hành: Windows 10/11 có Docker Desktop (WSL 2) hoặc Linux có Docker Engine + Compose v2.
- Tài nguyên khuyến nghị: 4 CPU, 6 GB RAM trống cho Docker, 5 GB dung lượng trống.
- Cổng cần trống trên host: 80, 443 (Nginx), 3000 (Grafana), 8080 (phpMyAdmin), 9090 (Prometheus), 3100 (Loki API).
- Công cụ: Git, trình duyệt hiện đại, `curl`.

Kiểm tra nhanh môi trường:

```bash
docker --version
docker compose version
docker info --format '{{.ServerVersion}}'
```

Nếu `docker info` báo lỗi, mở Docker Desktop và đợi trạng thái "Engine running" trước khi tiếp tục.

## 2. Cấu trúc dự án

```text
Gallery/
├── app/                     # Node.js + Express + EJS
│   ├── src/                 # controllers, routes, middleware, session store
│   ├── views/               # template EJS
│   ├── public/              # css, js, uploads (mount từ host)
│   └── test/                # test hồi quy chạy bằng node --test
├── db/init-scripts/         # init.sql, seed-demo.js, grant scripts
├── nginx/                   # nginx.conf, conf.d/default.conf, cert tự ký
├── prometheus/              # prometheus.yml
├── grafana/provisioning/    # datasource + dashboard
├── loki/                    # loki-config.yml
├── promtail/                # promtail-config.yml
├── healthcheck/             # probe HTTP tĩnh cho image distroless
├── docs/                    # báo cáo, changelog, ảnh minh chứng
├── docker-compose.yml
└── .env.example
```

## 3. Cấu hình biến môi trường

Sao chép file mẫu và điền giá trị thật (không commit `.env`):

```bash
cp .env.example .env
```

Các biến bắt buộc:

| Biến | Ý nghĩa | Ghi chú |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | Mật khẩu root MySQL | Chỉ dùng nội bộ container |
| `MYSQL_DATABASE` | Tên database | Mặc định `gallery_db` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Tài khoản ứng dụng dùng | Không dùng root cho app |
| `MYSQL_EXPORTER_PASSWORD` | Tài khoản cho mysqld-exporter | Chỉ quyền đọc thống kê |
| `GRAFANA_ADMIN_PASSWORD` | Mật khẩu admin Grafana | Đổi khi triển khai thật |
| `SESSION_SECRET` | Khóa ký cookie session | Tối thiểu 32 ký tự |
| `DEMO_ADMIN_PASSWORD` / `DEMO_USER_PASSWORD` | Mật khẩu tài khoản demo | Dùng cho seed |

Kiểm tra `.env` không bị Git theo dõi:

```bash
git check-ignore -v .env
```

## 4. Khởi chạy hệ thống

```bash
# 1. Kiểm tra cú pháp Compose
docker compose config --quiet

# 2. Build và khởi chạy toàn bộ stack
docker compose up -d --build

# 3. Theo dõi trạng thái (12 service, tất cả healthy)
docker compose ps

# 4. Xem log khi cần
docker compose logs -f --tail=100 web nginx
```

Seed dữ liệu demo (3 user, 5 album, 25 ảnh, tag, link chia sẻ). Chỉ chạy khi database còn trống; script sẽ từ chối xóa dữ liệu đang có nếu chưa đặt `SEED_ALLOW_DESTRUCTIVE=true`:

```bash
docker compose exec -T web node /app/db/init-scripts/seed-demo.js
```

Dừng hệ thống:

```bash
docker compose stop          # giữ container và dữ liệu
docker compose down          # xóa container, giữ volume dữ liệu
```

> Không dùng `docker compose down -v` hoặc xóa volume nếu chưa sao lưu: sẽ mất database, ảnh upload và dashboard.

## 5. Truy cập dịch vụ

| Dịch vụ | URL | Ghi chú |
|---|---|---|
| Ứng dụng Gallery | https://localhost | Chứng chỉ tự ký, bấm "Advanced → Proceed" |
| phpMyAdmin | http://localhost:8080 | Đăng nhập bằng `MYSQL_USER`/`MYSQL_PASSWORD` |
| Grafana | http://localhost:3000 | `admin` / `GRAFANA_ADMIN_PASSWORD` |
| Prometheus | http://localhost:9090 | Không cần đăng nhập, chỉ loopback |
| Loki API | http://localhost:3100 | Dùng cho truy vấn LogQL trực tiếp |

Tài khoản demo (mật khẩu đọc từ `.env`):

| Email | Vai trò |
|---|---|
| `admin@gallery.demo` | Quản trị viên |
| `user1@gallery.demo` | Người dùng thường |
| `user2@gallery.demo` | Người dùng thường |

## 6. Sử dụng các chức năng chính

1. **Đăng ký**: `/register` — username 3-50 ký tự (chữ, số, `.`, `_`, `-`), email hợp lệ, mật khẩu có chữ hoa/thường/số/ký tự đặc biệt.
2. **Đăng nhập / đăng xuất**: `/login`; đăng xuất bằng nút trong menu người dùng (gửi `POST /logout` có CSRF).
3. **Album**: `/albums` → "Tạo Album". Album công khai hiển thị cho khách; album riêng tư chỉ chủ sở hữu và admin thấy.
4. **Upload**: `/photos/upload` — chọn ảnh (JPEG/PNG/WebP, tối đa 10 MB/ảnh, 10 ảnh/lần), gán album và tiêu đề.
5. **Tag**: mở chi tiết ảnh, nhập tag và bấm "+ Thêm". Trang `/photos/tags` chỉ tổng hợp ảnh mà người xem được phép thấy.
6. **Tìm kiếm**: `/photos?q=...` tìm theo tên ảnh, album hoặc tag; hỗ trợ phân trang.
7. **Chia sẻ**: trong chi tiết album, chọn thời hạn 1/7/30 ngày → tạo link `/share/<token>`; thu hồi bằng nút "Thu hồi" (link trả 404 ngay sau khi thu hồi).
8. **Quản trị**: `/admin` — chỉ role `admin`; user thường nhận trang 403.

## 7. Kiểm tra sau khi triển khai

```bash
# Trạng thái container
docker compose ps

# Ứng dụng và health
curl -k -sS -o /dev/null -w '%{http_code}\n' https://localhost/
curl -k -sS https://localhost/health

# Chuyển hướng HTTP -> HTTPS
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost/

# Header bảo mật
curl -k -sS -D - -o NUL https://localhost/ | grep -Ei 'content-security|strict-transport|permissions-policy|x-frame|x-content|referrer|x-powered-by'

# /metrics không lộ ra ngoài
curl -k -sS -o /dev/null -w '%{http_code}\n' https://localhost/metrics

# Rate limit đăng nhập
for i in $(seq 1 7); do curl -k -s -o /dev/null -w '%{http_code}\n' https://localhost/login; done

# Prometheus
curl -s 'http://localhost:9090/api/v1/targets?state=active'
curl -s 'http://localhost:9090/api/v1/query?query=mysql_up'

# Grafana
curl -s http://localhost:3000/api/health
```

Kết quả mong đợi: 12/12 service healthy; `/health` trả `{"status":"healthy",...}`; `/metrics` trả 403 qua Nginx; request thứ 6-7 tới `/login` trả 429; Prometheus có 6 target UP và `mysql_up=1`; Grafana trả `database: ok`.

## 8. Monitoring và logging

### Prometheus

- Cấu hình tại `prometheus/prometheus.yml`, scrape 6 job: `prometheus`, `web`, `cadvisor`, `node-exporter`, `mysqld-exporter`, `nginx-prometheus-exporter`.
- Kiểm tra target: mở http://localhost:9090/targets.
- Truy vấn mẫu: `up`, `mysql_up`, `rate(container_cpu_usage_seconds_total[5m])`, `nginx_connections_active`.

### Grafana

- 5 dashboard được provision tự động: Container Monitoring, MySQL Database Monitoring, Nginx Server Monitoring, Web Application Monitoring, Gallery Logs.
- Datasource Prometheus và Loki đã cấu hình UID cố định; health kiểm tra tại Connections → Data sources.

### Loki + Promtail

- Promtail đọc log stdout/stderr của mọi container thuộc project `gallery` và file `app/src/logs/*.log`.
- Positions lưu trong volume `promtail_data` để không đọc lại log cũ sau restart.
- Truy vấn mẫu (đã chạy ngày 23-10-2026, cửa sổ 24 giờ):

| Mục đích | Truy vấn | Số dòng |
|---|---|---|
| Tổng log | `sum(count_over_time({container=~".+"}[24h]))` | 17.388 |
| Log ứng dụng | `sum(count_over_time({container="web"} \|= "HTTP request" [24h]))` | 10.437 |
| Log Nginx | `sum(count_over_time({container="nginx"}[24h]))` | 1.610 |
| Lỗi mức error | `sum(count_over_time({job="application"} \| json \| level="error" [24h])) or vector(0)` | 0 |
| HTTP 5xx | `sum(count_over_time({container="web"} \| json \| status_code >= 500 [24h])) or vector(0)` | 3 |

```logql
{container="web"} | json | status_code >= 500
{container="nginx"} |= " 429 "
{job="application"} | json | level=~"error|warn"
```

## 9. Kiểm thử

```bash
# Test hồi quy (chỉ đọc DB + gọi HTTP, không tạo dữ liệu)
docker compose exec -T web node --test test/
```

Bộ test gồm 8 ca:

1. Khách không thấy ảnh thuộc album riêng tư trên `/photos/tags`.
2. Khách không thấy ảnh thuộc album riêng tư trên trang chủ.
3. Album/ảnh/thumbnail riêng tư trả 404 cho khách.
4. Ảnh công khai vẫn xem được (chi tiết + thumbnail 200).
5. Link chia sẻ hợp lệ phục vụ ảnh; token sai trả 404.
6. Route không tồn tại trả 404, không lộ stack trace.
7. `/health` không chứa trường `error`.
8. `GET /logout` không hủy phiên; `POST /logout` thiếu CSRF trả 403.

Kết quả thực tế: **8/8 PASS** (chạy lại ngày 23-10-2026).

Ngoài ra, trong đợt kiểm thử giao diện trước đó, kịch bản Playwright đã kiểm tra 32 bước (đăng ký, đăng nhập, album, upload, tag, tìm kiếm, chia sẻ/thu hồi, 403, 404, đăng xuất) — **32/32 PASS**; dữ liệu kiểm thử được xóa sau khi chạy. Đây là số liệu lịch sử, chưa chạy lại trong phiên 23-10-2026.

## 10. Sao lưu và khôi phục

```bash
# Sao lưu database
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers gallery_db' > gallery-db-$(date +%F).sql

# Sao lưu ảnh
cp -r app/public/uploads /backup/gallery-uploads-$(date +%F)

# Khôi phục
docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" gallery_db' < gallery-db-2026-10-23.sql
```

Khuyến nghị: sao lưu trước mọi thay đổi quyền DB hoặc nâng cấp image; kiểm tra file dump có `CREATE TABLE` trước khi xóa bản cũ.

## 11. Xử lý sự cố

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `docker info` lỗi | Docker Desktop chưa chạy | Mở Docker Desktop, đợi engine ready |
| Web unhealthy | DB chưa healthy hoặc sai `.env` | `docker compose logs db web`; sửa `.env` rồi `docker compose up -d web` |
| 502 Bad Gateway | Web restart hoặc chưa lên | `docker compose ps`; đợi healthcheck |
| 429 khi đăng nhập | Rate limit 5r/m | Đợi ~1 phút, không tắt giới hạn |
| Trình duyệt báo chứng chỉ | Self-signed | Chấp nhận cảnh báo hoặc dùng `curl -k` |
| Grafana trống | Sai khoảng thời gian | Chọn "Last 30 minutes"; kiểm tra Prometheus Targets |
| Loki thiếu log | Promtail mất kết nối socket | `docker compose logs promtail`; kiểm tra mount `/var/run/docker.sock` |
| Upload 413 | File > 10 MB | Giảm kích thước ảnh |
| Không đăng nhập được phpMyAdmin | Sai tài khoản | Dùng đúng `MYSQL_USER`/`MYSQL_PASSWORD` trong `.env` |

## 12. Hạn chế đã biết

- Chứng chỉ tự ký, không phù hợp production.
- CSP còn `'unsafe-inline'` do inline script/`onclick` trong template.
- `app_user` runtime chỉ có `SELECT, INSERT, UPDATE, DELETE` trên `gallery_db`; `gallery_exporter` có `SELECT, PROCESS, REPLICATION CLIENT` cho monitoring.
- phpMyAdmin không thể read-only/drop toàn bộ capability (yêu cầu của image).
- Chưa có Alertmanager; Loki chưa bật compactor retention.
