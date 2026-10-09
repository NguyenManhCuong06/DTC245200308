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
