# Changelog

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
- Form upload hiển thị trạng thái chọn ảnh và đang tải lên; các trạng thái rỗng, cảnh báo, thành công và xác nhận thao tác được trình bày bằng component nội bộ.
- Kiểm tra thật sau Docker build: `/`, `/albums`, `/photos`, `/login`, `/health` và hai asset Bootstrap đều trả HTTP 200 qua HTTPS.

### Dữ liệu demo
- Seed tạo 3 tài khoản, 5 album, 25 ảnh minh họa gốc được raster hóa thành JPEG và thumbnail WebP, tag và link chia sẻ có token ngẫu nhiên.
- Ảnh minh họa được tạo trong seed, không lấy từ nguồn bên thứ ba; chúng không phải ảnh chụp. Mật khẩu demo lấy từ `.env`, nếu thiếu thì seed sinh và in mật khẩu ngẫu nhiên đúng một lần.
- Seed chạy trong web container với quyền ghi vào thư mục upload dùng chung; nginx không còn mount thư mục upload để tránh khả năng phục vụ file tĩnh ngoài route kiểm tra quyền.
- Kiểm tra sau `docker compose down -v` và `docker compose up -d --build`: seed tạo 3 user, 5 album, 25 ảnh và 25 thumbnail; share link cùng ảnh tải qua link trả HTTP 200, còn album private, ảnh private và URL trực tiếp `/uploads/...` trả HTTP 404.
