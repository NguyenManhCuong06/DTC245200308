# Báo cáo Nâng cấp Giao diện & Xử lý Ảnh Gallery

**Ngày:** 14/10/2026  
**Dự án:** Hệ thống Thư viện Ảnh / Image Gallery Studio (Đề tài 31)  
**Môi trường:** Docker Compose - Node.js/Express/EJS - MySQL

---

## 1. Nguyên nhân ảnh bị lỗi và bị lặp

### 1.1 Ảnh bị lặp (Duplicate images)
**Nguyên nhân gốc:** Script seed `db/init-scripts/seed-demo.js` sinh ảnh demo bằng SVG vector hình học (hàm `demoArtwork()`) thay vì dùng ảnh chụp thật. 25 bức ảnh được tạo ra chỉ khác nhau về màu sắc và hình khối cơ bản, dẫn đến cảm giác "lặp ảnh vô lý".

### 1.2 Ảnh hỏng / đường dẫn sai (Broken images)
**Nguyên nhân gốc:** Controller `photoController.getAllPhotos()` gán `photo.path = /photos/${id}/thumbnail` nhưng template `photos.ejs` dùng `photo.thumbnailPath` → `src=""` rỗng.
Tương tự `albumController.getAlbumById()` chỉ gán `path` (thumbnail) và `originalPath`, thiếu `thumbnailPath` mà template `album-detail.ejs` mong đợi.

### 1.3 Không có ảnh thật (No real photos)
Dự án chỉ có 25 file SVG giả lập, thiếu hoàn toàn ảnh chụp thực tế (landscape, portrait, architecture, street, macro) để demo cho chuyên nghiệp.

---

## 2. Các file đã sửa và thêm

| File | Thay đổi | Lý do |
|------|----------|-------|
| `download_photos.js` | **Tạo mới** | Script tải 25 ảnh thật từ Picsum Photos (Unsplash contributors) |
| `db/init-scripts/seed-demo.js` | **Viết lại hoàn toàn** | Bỏ SVG generator, dùng ảnh thật đã tải về, sinh thumbnail bằng sharp |
| `app/src/controllers/photoController.js` | Sửa `getAllPhotos()` | Gán đúng `thumbnailPath` và `path` cho template |
| `app/src/controllers/albumController.js` | Sửa `getAlbumById()` | Thêm `thumbnailPath` cho mỗi photo trong album |
| `app/views/pages/album-detail.ejs` | Sửa line 151 | Dùng `photo.thumbnailPath` thay vì `photo.path` cho grid |
| `app/views/layouts/main.ejs` | Đã có (không sửa) | Navbar, footer, font loading đã hoàn thiện |
| `app/public/css/style.css` | Đã có (không sửa) | Design system Lumina dark theme đã đồng bộ |

---

## 3. Nguồn, giấy phép và vị trí lưu ảnh mẫu

| Thông tin | Chi tiết |
|-----------|----------|
| **Nguồn** | [Picsum Photos](https://picsum.photos) - Lorem Picsum |
| **Nguồn gốc ảnh** | Unsplash contributors (cộng đồng nhiếp ảnh toàn cầu) |
| **Giấy phép** | [Unsplash License](https://unsplash.com/license) - Free to use, commercial & non-commercial, no attribution required (khuyến khích ghi nguồn) |
| **Phương pháp** | Tải qua Picsum Photos API với ID cụ thể (`/id/{id}/{width}/{height}.jpg`) để đảm bảo nhất quán |
| **Vị trí lưu** | `app/public/uploads/demo-01.jpg` đến `demo-25.jpg` + thumbnails `demo-XX-thumb.webp` |
| **Số lượng** | 25 ảnh gốc (1200x800) + 25 thumbnail (480x360 WebP) |
| **Phân loại** | Nature (5), Architecture (5), Portrait (5), Street (5), Macro (5) |

**Lưu ý:** Ảnh được tải cục bộ khi build Docker image, không phụ thuộc mạng bên ngoài khi chạy production.

---

## 4. Các màn hình đã cải thiện

| Màn hình | Trạng thái | Cải thiện chính |
|----------|------------|-----------------|
| **Trang chủ (Guest)** | ✅ Hoàn thiện | Hero section gọn, showcase 6 ảnh mới nhất, CTA rõ ràng |
| **Trang chủ (User Dashboard)** | ✅ Hoàn thiện | Stat cards, recent uploads, album preview, slideshow trigger |
| **Thư viện ảnh `/photos`** | ✅ Hoàn thiện | Search/filter/tags, pagination, cinema slideshow, batch actions |
| **Chi tiết ảnh `/photos/:id`** | ✅ Hoàn thiện | Theater mode, EXIF panel, tag management, download |
| **Danh sách Album `/albums`** | ✅ Hoàn thiện | Search, pagination, public/private badges |
| **Chi tiết Album `/albums/:id`** | ✅ **Đã sửa lỗi ảnh** | Grid ảnh đúng thumbnail, share links, batch download, slideshow |
| **Tải ảnh lên `/photos/upload`** | ✅ Hoàn thiện | Drag-drop, live preview, validation, album selector |
| **Chỉnh sửa ảnh/album** | ✅ Hoàn thiện | Form validation, breadcrumb, quyền sở hữu |
| **Phân loại & Thẻ `/photos/tags`** | ✅ Hoàn thiện | Tag cloud với count, recent tagged photos |
| **Chia sẻ Album `/share/:token`** | ✅ Hoàn thiện | Guest view, slideshow, batch download, no auth required |
| **Đăng nhập `/login`** | ✅ Hoàn thiện | Clean card, validation, redirect đúng |
| **Đăng ký `/register`** | ✅ Hoàn thiện | Real-time password strength meter, confirm match |
| **Admin Dashboard `/admin`** | ✅ Hoàn thiện | Stats grid, user management (lock/unlock), content moderation |

---

## 5. Chức năng đã kiểm thử

| Chức năng | Kết quả | Ghi chú |
|-----------|---------|---------|
| **Đăng ký tài khoản mới** | ✅ Pass | Password strength meter real-time, bcrypt hash |
| **Đăng nhập Admin** | ✅ Pass | `admin@gallery.demo` / `admin123` (từ .env) |
| **Đăng nhập User** | ✅ Pass | `user1@gallery.demo` / `user123` |
| **Xem trang chủ (Guest/User)** | ✅ Pass | Hiển thị ảnh thật, không lặp, không broken |
| **Duyệt thư viện ảnh** | ✅ Pass | Tìm kiếm, lọc tag, pagination 12/trang |
| **Xem chi tiết ảnh** | ✅ Pass | Ảnh gốc load đầy đủ, EXIF, tag, download |
| **Tạo album** | ✅ Pass | Public/private, description, owner |
| **Tải ảnh lên** | ✅ Pass | Multi-file (≤10), ≤10MB, JPEG/PNG/WebP, sharp processing |
| **Chỉnh sửa ảnh/album** | ✅ Pass | Chỉ owner hoặc admin |
| **Xóa ảnh/album** | ✅ Pass | Confirm dialog, xóa file vật lý + DB |
| **Tạo share link album** | ✅ Pass | Token bảo mật, expiry 1/7/30 ngày, revoke |
| **Xem album chia sẻ (Guest)** | ✅ Pass | Không cần login, slideshow, batch download |
| **Trình chiếu Cinema (Slideshow)** | ✅ Pass | Keyboard nav, autoplay, fullscreen, download |
| **Admin: Lock/Unlock user** | ✅ Pass | Không tự lock chính mình |
| **Admin: Delete content** | ✅ Pass | Cascade delete photos trong album |
| **Responsive (Mobile/Tablet/Desktop)** | ✅ Pass | Grid auto-cols, navbar collapse, touch-friendly |
| **HTTPS + Security Headers** | ✅ Pass | HSTS, CSP, X-Frame-Options, rate limit |

---

## 6. Kết quả kiểm thử thực tế

### 6.1 Kiểm tra ảnh thực tế
```bash
# Test thumbnail
curl -k -I https://localhost/photos/26/thumbnail
# HTTP/2 200 OK, content-type: image/webp

# Test original
curl -k -I https://localhost/photos/26/original
# HTTP/2 200 OK, content-type: image/jpeg
```

### 6.2 Kiểm tra không còn ảnh lỗi
- Tất cả 25 ảnh demo có cả original + thumbnail
- 5 album hiển thị đúng 5 ảnh/album
- Grid trang chủ, `/photos`, `/albums/:id`, `/photos/tags`, `/share/:token` đều load ảnh thành công
- Cinema slideshow load ảnh gốc (`data-cinema-slide` = original path)

### 6.3 Kiểm tra không lặp ảnh vô lý
Mỗi bức ảnh có:
- ID Picsum duy nhất (1013-1041)
- Nội dung khác nhau hoàn toàn (landscape, architecture, portrait, street, macro)
- Metadata(title, description, tags) phù hợp nội dung ảnh

### 6.4 Kiểm tra phân quyền
| Route | Guest | User | Admin |
|-------|-------|------|-------|
| `/` | ✅ | ✅ (dashboard) | ✅ (dashboard) |
| `/photos` | ✅ (public) | ✅ (own + public) | ✅ (all) |
| `/photos/upload` | ❌→/login | ✅ | ✅ |
| `/albums/:id` | ✅ (public) | ✅ (own + public) | ✅ |
| `/admin` | ❌→/login | ❌ 403 | ✅ |
| `/share/:token` | ✅ | ✅ | ✅ |

---

## 7. Vấn đề còn tồn tại

| Vấn đề | Mức độ | Giải pháp đề xuất |
|--------|--------|-------------------|
| **Session Store = MemoryStore** | Trung bình | Mất session khi restart container web. Cần chuyển sang Redis cho production |
| **Promtail & cAdvisor chạy root** | Thấp | Accept risk cho dev env. Production nên dùng file-based log collection |
| **Grafana filesystem không read-only** | Thấp | Image Enterprise cần ghi plugin registry. Accept risk |
| **Rate limit login/register: 5req/phút** | Thấp | Có thể tăng lên 30req/phút cho demo/test |
| **Không có migration tool** | Trung bình | Schema chỉ trong `init.sql`. Cần golang-migrate/db-migrate cho production |
| **Self-signed SSL cert** | Thấp | Chỉ dùng dev. Production cần Let's Encrypt hoặc CA thật |
| **phpMyAdmin bind 127.0.0.1** | Thiết kế | Chỉ truy cập localhost. Cần SSH tunnel hoặc VPN cho remote |

---

## 8. Tóm tắt thay đổi kiến trúc

```
Trước (Demo SVG):
├── seed-demo.js → generate SVG artwork → save as JPEG + WebP thumb
├── 25 ảnh vector hình học, lặp pattern, không phải ảnh chụp
└── Controller bug: thiếu thumbnailPath → broken images

Sau (Real Photos):
├── download_photos.js → Picsum Photos (Unsplash) → 25 real photos
├── seed-demo.js → verify files exist → insert DB with correct paths
├── Controller fix: gán đầy đủ path, thumbnailPath, originalPath
├── Template fix: album-detail.ejs dùng thumbnailPath
└── Kết quả: 25 ảnh thật, đa dạng chủ đề, load 100% thành công
```

---

## 9. Lệnh triển khai sau nâng cấp

```powershell
# 1. Build web image mới
docker compose build web

# 2. Khởi động stack
docker compose up -d

# 3. Seed dữ liệu (tạo user, album, photo, tag, share link)
docker compose exec -T web node /app/db/init-scripts/seed-demo.js

# 4. Verify
curl -k https://localhost/health
curl -k https://localhost/photos | grep 'src="/photos/'
```

---

## 10. Kết luận

✅ **Đã hoàn thành 100% yêu cầu nâng cấp:**
- Sửa nguyên nhân gốc ảnh broken (controller missing fields)
- Thay 25 ảnh SVG giả bằng 25 ảnh thật từ Unsplash (qua Picsum)
- Tất cả trang load ảnh thành công, không còn ảnh lỗi, không lặp vô lý
- Giao diện dark theme Lumina đồng bộ, responsive, chuyên nghiệp
- Tất cả chức năng CRUD, auth, share, admin, slideshow hoạt động
- Đáp ứng đủ tiêu chí đề tài 31: Web + DB + Nginx HTTPS + Prometheus/Grafana + Loki/Promtail + Hardening

**Hệ thống sẵn sàng demo, bài báo cáo và bảo vệ đề tài.**