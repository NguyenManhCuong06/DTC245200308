*Phần 1: Yêu cầu chung cho tất cả các đề 
1.Quản lý toàn bộ mã nguồn và file cấu hình (docker-compose, Nginx,Prometheus…) trên GitHub (commit rõ ràng, có README). Tạo tài khoản và đặt tên theo mã số SV.

2.Triển khai ứng dụng web nêu trên, tích hợp Database và công cụ quản lý DB tương ứng.

3.Cấu hình Nginx làm reverse proxy (có HTTPS tự ký hoặc security headers cơ bản). -> commit 1

4.Tích hợp Prometheus + Grafana để giám sát container, web server và database. -> Commit 2

5.Triển khai hệ thống log tập trung Loki + Promtail, truy vấn log bằng LogQL (ít nhất 2–3 query). -> commit 3

6.Áp dụng các biện pháp hardening: non-root container, network isolation, mật khẩu mạnh, hạn chế quyền, security headers Nginx, v.v.

7.Viết báo cáo tổng hợp tối thiểu 10 trang, yêu cầu:

a)Thông tin của sinh viên, chủ đề đưa vào bìa ngoài cùng (định dạng chuẩn như báo cáo thực tập)

b)Mô tả cấu trúc của hệ thống, cách thức hoạt động, kết quả của 6 bước trên (có hình minh họa đưa vào báo cáo)

Lưu ý: Tất cả dịch vụ triển khai bằng Docker Compose. Sinh viên cần có repository GitHub, README hướng dẫn chạy, và demo đầy đủ các thành phần (website, DB tool, Grafana, LogQL, hardening). 
*Phần 2: Tiêu chí và nội dung đánh giá 
1.Quản lý mã nguồn trên GitHub Repository đầy đủ (source + cấu hình), đủ 03 commit và nội dung có ý nghĩa, có README hướng dẫn chạy hệ thống rõ ràng.
2.Triển khai ứng dụng + Database Ứng dụng chạy ổn định, kết nối DB thành công, có phpMyAdmin hoặc pgAdmin hoạt động.
3. Nginx Reverse  Proxy Cấu hình reverse proxy đúng, truy cập website qua Nginx (có HTTPS hoặc security headers cơ bản).
4. Hệ thống giám sát (Prometheus + Grafana) Prometheus thu thập metrics, Grafana có dashboard giám sát container / web / DB.
5. Hệ thống log tập trung (Loki) Loki + Promtail hoạt động, truy vấn được log bằng LogQL (ít nhất 2 – 3 query cơ bản).
6. Hardening hệ thống Áp dụng ít nhất 3 – 4 biện pháp bảo mật (non-root container, network isolation, mật khẩu mạnh, security headers, hạn chế quyền DB...).
7. Tổng thể và Trình bày Hệ thống chạy hoàn chỉnh bằng docker-compose, demo rõ ràng, có screenshot/minh chứng, chắc kiến thức, hiểu bài.