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
