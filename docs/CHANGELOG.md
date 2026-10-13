# Changelog

## Giai đoạn 3

### Loki và Promtail
- Docker service discovery đọc JSON container logs từ Docker socket, gán nhãn container/service/stream và bao gồm access/error stdout/stderr của Nginx.
- Docker service discovery dựng log path từ Docker container ID; trên Docker Desktop WSL 2, Promtail tiếp tục thu container logs sau khi bỏ bind mount `/var/lib/docker/containers`. File JSON ứng dụng tại `/app/src/logs/*.log` được parse riêng.
- Thêm datasource UID ổn định và dashboard Grafana **Gallery Logs** với log containers, lọc lỗi/status 4xx/5xx và `count_over_time`.
- Kiểm tra thật bằng Loki API sau clean rebuild, request đăng nhập, album, upload, link chia sẻ, 403 và 404: `{container="web"}` trả 1.000 dòng (giới hạn query), lọc Nginx 404 trả 4 dòng, regex Nginx `error|warn` trả 1 dòng, lọc application HTTP 4xx/5xx trả 104 dòng, và `sum(count_over_time({job="application"}[5m]))` trả giá trị 55.

### Hardening runtime và Nginx
- Chuyển Nginx sang image `nginxinc/nginx-unprivileged:1.31.6-alpine`, nội bộ 8080/8443; root filesystem read-only, tmpfs cho dữ liệu tạm, no-new-privileges và drop ALL capabilities.
- Tách rate-limit cho `/login` và `/register`; kiểm tra request thật trả 429 sau burst. Thêm HTTP→HTTPS và xác minh response headers/HSTS/CSP cùng asset Bootstrap nội bộ; body lớn hơn giới hạn 105 MiB nhận 413.
- Gắn health probe HTTP tĩnh cho Loki, Promtail và Nginx exporter (image upstream distroless, không có shell/curl). Khai báo MySQL root host là localhost, giới hạn published monitoring ports vào loopback, và thêm quyền/capability hardening cho Promtail.
- Healthcheck MySQL xác nhận listener TCP loopback để Compose chỉ khởi động web khi DB nhận kết nối qua TCP; sau clean rebuild, `docker compose logs web` không có `ECONNREFUSED` khi startup.
- Sau clean rebuild: Prometheus API báo 6/6 targets UP; Grafana datasource health của Loki và Prometheus đều `OK`, dashboard Gallery Logs có 3 panels; truy vấn Grafana datasource proxy trả dữ liệu cho container, Nginx và MySQL.
- Cấp `UPLOAD_DIR=/app/public/uploads` cho seed chạy trong container; clean seed tạo 3 user, 5 album, 25 ảnh và 25 thumbnail cùng share link còn hiệu lực.
- Grafana giữ root filesystem writable có chủ đích: read-only đã làm plugin updater không ghi được thư mục bundled plugins và khiến datasource health trả 404 `plugin.notRegistered`; các capability vẫn được drop và privilege escalation bị cấm.
- Đã xác minh cấu hình và Docker runtime cho Docker Desktop data ở `D:\Docker\DockerDesktopWSL`; phần kiểm thử trạng thái services sau clean rebuild được ghi trong README.

### Kiểm chứng bổ sung ngày 13-10-2026

- Sau khi gửi request 404 tới `/error` và `/gd3-promtail-no-bind-20261013`,
  Loki API trả HTTP 200 trong khoảng 5 phút UTC từ `2026-10-13T14:55:23Z` đến
  `2026-10-13T15:00:23Z`; range query giới hạn 1000 dòng. IP trong mẫu đã che.

```logql
# 35 dòng; mẫu Nginx notice, start worker process
{container="nginx"}

# 3 dòng; mẫu GET /gd3-promtail-no-bind-20261013, status 404
{container="nginx"} |= " 404 "

# 3 dòng; mẫu application GET /error, status 404
{job="application"} |~ "(?i)(error|warn)"

# 1 sample, giá trị 35; cửa sổ count_over_time là 5 phút
sum(count_over_time({container="nginx"}[5m]))
```

- Prometheus API báo 6/6 targets UP. Grafana health trả HTTP 200; datasource
  Prometheus và Loki đều `OK`, API liệt kê 5 dashboards.
- Từ Windows host, Gallery, phpMyAdmin, Grafana, Prometheus và Loki API trả HTTP
  200. phpMyAdmin được chuyển sang `http://localhost:8080/`, bind chỉ
  `127.0.0.1`; đăng nhập bằng app user và truy vấn `SHOW TABLES` liệt kê sáu
  bảng trong `gallery_db`. IP LAN bị từ chối ở port 8080. Web trả HTTP 301 trên
  HTTP và HTTP 200 trên HTTPS qua LAN; route HTTPS `/phpmyadmin/` đã bị gỡ.
- Grafana, Prometheus, Loki và exporter ports bị từ chối qua IP LAN; MySQL port
  3306 cũng không nhận kết nối LAN.
- `SHOW GRANTS` qua phpMyAdmin xác nhận app đăng nhập bằng `app_user`, không phải
  root; quyền app là `SELECT`, `INSERT`, `UPDATE`, `DELETE` trong schema
  `gallery_db`. `gallery_exporter` có `SELECT`, `PROCESS`, `REPLICATION CLIENT`
  trên `*.*`, không có quyền ghi. Giữ quyền SELECT toàn cục theo tập quyền đọc/
  giám sát được mysqld_exporter tài liệu hóa để thu metrics bảng trạng thái hệ
  thống, không chỉ dữ liệu `gallery_db`.
- Đổi mount cAdvisor từ `/var/run:rw` sang `/var/run:ro`; sau recreate cAdvisor
  healthy, Prometheus scrape UP, và metric CPU/RAM vẫn có nhãn `name=web`, cùng
  nhãn `db` và `nginx`.
- Đã bỏ mount `/var/lib/docker/containers` khỏi Promtail. Sau recreate, Promtail
  healthy; query container Nginx và lọc 404 có log mới, bốn query LogQL bên trên
  đều cho kết quả dương tính.
- cAdvisor mount `/var/run` ở chế độ chỉ đọc; sau recreate container healthy và
  metrics theo nhãn container `web`, `db`, `nginx` còn tồn tại.
- Docker socket mount của Promtail vẫn `:ro`. Chế độ read-only của mount không
  giới hạn các lệnh ghi được gửi qua Docker API; ghi nhận đây là rủi ro được
  chấp nhận khi dùng docker service discovery, không dùng proxy service.
- Secret scan hai commit chưa push và tag `gd3-log-hardening-ok` không tìm thấy
  private key hoặc credential literal theo các mẫu quét; không in giá trị nào.

## Giai đoạn 2

### Album
- Hoàn thiện tạo, sửa tên/mô tả/chế độ riêng tư và xóa album.
- Form xóa dùng `POST /albums/:id/delete`, khớp route và có xác nhận trình duyệt.
- Album riêng tư không hiển thị cho khách hoặc người dùng không sở hữu album.

### Ảnh
- Upload tối đa 10 ảnh mỗi lần; kiểm tra dữ liệu ảnh thực, MIME, phần mở rộng và giới hạn 10 MB mỗi ảnh.
- Tên file lưu trữ được sinh ngẫu nhiên; Sharp tạo thumbnail WebP và trang lưới dùng thumbnail.
- Ảnh chỉ được phục vụ qua route kiểm tra quyền; đường dẫn `/uploads/...` không còn được phục vụ công khai.
- Thêm xem ảnh lớn, sửa tiêu đề/mô tả và xóa ảnh có xác nhận.

### Phân quyền
- Album và ảnh riêng tư chỉ được xem bởi chủ sở hữu; API cũng lọc nội dung và không trả đường dẫn file lưu trữ.
- Sửa/xóa được giới hạn theo chủ sở hữu; tải file chỉ qua route kiểm tra quyền, không qua đường dẫn tĩnh.
- Thêm middleware xác thực và kiểm tra role admin để các route quản trị dùng chung.

### Chia sẻ
- Chủ album có thể tạo link khách chỉ đọc, chọn thời hạn 1, 7 hoặc 30 ngày và thu hồi link.
- Link hết hạn trả HTTP 410; link bị thu hồi hoặc ảnh được gọi qua link đã thu hồi trả 404.
- Ảnh album private được phục vụ cho khách chỉ qua media route gắn với link còn hiệu lực.

### Thẻ ảnh
- Chủ ảnh có thể gắn/bỏ gắn tag; danh sách ảnh hỗ trợ lọc theo tag.
- Tag được chuẩn hóa và kiểm tra ký tự/độ dài trước khi ghi vào cơ sở dữ liệu.

### Tìm kiếm và phân trang
- Album có thể tìm theo tên/mô tả; ảnh có thể tìm theo tên ảnh, tên album hoặc tên tag.
- Danh sách album và ảnh được phân trang; bộ lọc hiện tại được giữ trong liên kết chuyển trang.

### Quản trị
- Trang Admin liệt kê user, nội dung gần đây và thống kê số user/album/ảnh cùng dung lượng file thực trên đĩa.
- Admin có thể khóa/mở user và xóa album (kèm ảnh) hoặc ảnh vi phạm; route kiểm tra role admin.
- Tài khoản bị khóa không thể đăng nhập và phiên hiện tại không còn được xác thực cho request tiếp theo.

### Giao diện
- Bootstrap CSS/JS được phục vụ từ dependency cài trong ứng dụng tại `/vendor/bootstrap`; không phụ thuộc CDN.
- Bổ sung menu thu gọn trên màn hình nhỏ, bố cục co giãn cho tìm kiếm/lightbox và trang lỗi có hướng dẫn quay lại thư viện.
- Card đăng nhập/đăng ký/lỗi và thanh thao tác ảnh co giãn trên màn hình hẹp; trường tìm kiếm album tự xuống dòng.
- Form upload hiển thị trạng thái chọn ảnh và đang tải lên; các trạng thái rỗng, cảnh báo, thành công và xác nhận thao tác được trình bày bằng component nội bộ.
- Kiểm tra thật sau Docker build: `/`, `/albums`, `/photos`, `/login`, `/health` và hai asset Bootstrap đều trả HTTP 200 qua HTTPS.

### Dữ liệu demo
- Seed tạo 3 tài khoản, 5 album, 25 ảnh minh họa gốc được raster hóa thành JPEG và thumbnail WebP, tag và link chia sẻ có token ngẫu nhiên.
- Ảnh minh họa được tạo trong seed, không lấy từ nguồn bên thứ ba; chúng không phải ảnh chụp. Mật khẩu demo lấy từ `.env`, nếu thiếu thì seed sinh và in mật khẩu ngẫu nhiên đúng một lần.
- Seed chạy trong web container với quyền ghi vào thư mục upload dùng chung; nginx không còn mount thư mục upload để tránh khả năng phục vụ file tĩnh ngoài route kiểm tra quyền.
- Kiểm tra sau `docker compose down -v` và `docker compose up -d --build`: seed tạo 3 user, 5 album, 25 ảnh và 25 thumbnail; share link cùng ảnh tải qua link trả HTTP 200, còn album private, ảnh private và URL trực tiếp `/uploads/...` trả HTTP 404.
