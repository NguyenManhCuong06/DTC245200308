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
- Secret scan các commit chưa push trong `origin/dev..HEAD` và tag local
  `gd3-log-hardening-ok` không tìm thấy private key hoặc credential literal
  theo các mẫu quét; không in giá trị nào.

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

## Giai đoạn hoàn thiện 23-10-2026

### Quyền riêng tư ảnh (L4)
- `GET /photos/tags` trước đây chỉ lọc `photos.is_public`, bỏ qua `albums.is_public`, nên khách thấy tiêu đề và thumbnail của ảnh nằm trong album riêng tư (5 ảnh, id 66-70, album 14).
- Đã sửa truy vấn tag và danh sách ảnh gần đây: ảnh chỉ hiển thị khi bản thân ảnh công khai **và** album chứa nó công khai, hoặc người xem là chủ sở hữu, hoặc là admin. Số đếm tag dùng `COUNT(p.id)` sau khi join nên tag chỉ còn ảnh riêng tư không còn xuất hiện với khách.
- Thêm bộ test hồi quy `app/test/privacy.test.js` chạy bằng `node --test` trong container web (đọc DB và gọi HTTP thật, chỉ SELECT).

### Đăng nhập, đăng xuất, thông báo lỗi (L11, L12)
- Đăng xuất chuyển sang `POST /logout` có CSRF; `GET /logout` chỉ chuyển hướng về trang chủ. Cookie được xóa đúng tên `gallery.sid` (trước đây xóa `connect.sid`, không khớp cấu hình session).
- Đăng ký kiểm tra định dạng username (3-50 ký tự, chữ/số/`.`/`_`/`-`) và email trước khi ghi DB.
- Đăng nhập trả về một thông báo duy nhất "Email hoặc mật khẩu không đúng." cho email không tồn tại, tài khoản bị khóa và sai mật khẩu, tránh dò tài khoản.

### Hardening (L8, L9, L10, L15, L16)
- Express tắt `X-Powered-By`; Nginx thêm `proxy_hide_header X-Powered-By`.
- CSP bổ sung `base-uri`, `form-action`, `frame-ancestors`, `object-src`; HSTS thêm `includeSubDomains`; thêm `Permissions-Policy`. `script-src`/`style-src` vẫn cần `'unsafe-inline'` vì các trang EJS hiện dùng inline script và thuộc tính `onclick` (ghi rõ trong README).
- `/health` chỉ trả `{status}`; lỗi chi tiết ghi vào log phía server. Middleware admin trả trang 403 thay vì 404.
- Mọi service dùng `json-file` với `max-size: 10m`, `max-file: 3` để chặn log phình to.
- Promtail lưu `positions` trong volume `promtail_data` và bỏ qua log container cũ hơn 24 giờ, nên không còn lỗi `entry too far behind` sau mỗi lần restart.
- phpMyAdmin không thể `cap_drop: ALL`/`read_only` vì entrypoint cần `chown` và Apache cần `setuid/setgid`; đã kiểm tra thực tế và ghi nhận đây là ngoại lệ hardening (service chỉ bind loopback).

### Kiểm thử thực tế ngày 23-10-2026
- `docker compose exec -T web node --test test/` → 7/7 test PASS (quyền riêng tư album, media private trả 404, ảnh công khai 200, share link hợp lệ/hết hiệu lực, 404 không lộ stack trace, `/health` không lộ lỗi, logout không có CSRF trả 403).
- Kịch bản Playwright chạy trên giao diện thật (Edge headless) → 32/32 bước PASS: đăng ký, đăng nhập, tạo album private, upload, gắn tag, tìm kiếm, tạo link chia sẻ, khách mở link, thu hồi link (404), khách bị chặn album/ảnh/thumbnail private (404), user thường vào `/admin` nhận 403, admin vào `/admin` nhận 200, đăng xuất xóa phiên. Dữ liệu kiểm thử (user `e2e_*`, album, ảnh, file upload) đã được xóa; DB trở lại 3 user / 5 album / 25 ảnh / 73 file upload.
- Header qua HTTPS: có `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`; không còn `X-Powered-By`.
- Rate limit `/login` (5r/m, burst 5) trả 429 khi vượt ngưỡng; quan sát trong log Nginx khi chạy kiểm thử.
- Prometheus: 6/6 target UP, `mysql_up=1`. Grafana: 2 datasource OK, 5 dashboard; dashboard Gallery Logs hiển thị log thật của container web.
- LogQL 24 giờ gần nhất: `{container=~".+"}` = 17.388 dòng; `{container="web"} |= "HTTP request"` = 10.437 dòng; `{container="nginx"}` = 1.610 dòng; `{job="application"} | json | level="error"` = 0 dòng; `{container="web"} | json | status_code >= 500` = 3 dòng (đều là `/health` 503 khi DB được recreate, không phải lỗi ứng dụng).
- Ảnh chụp thực tế của ứng dụng, phpMyAdmin, Prometheus và Grafana lưu tại `docs/screenshots/`.

### Tồn đọng có kiểm soát
- Quyền DB runtime của `app_user` vẫn là `ALL PRIVILEGES` trên `gallery_db` (script khởi tạo chỉ định SELECT/INSERT/UPDATE/DELETE). Chưa thu hẹp vì cần phê duyệt thao tác trên DB đang chạy.
- Mật khẩu MySQL/Grafana hiện tại chưa được đổi sang mật khẩu mạnh hơn (cần phê duyệt, không làm mất dữ liệu).

