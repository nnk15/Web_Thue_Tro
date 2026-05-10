# Frontend HTML/CSS

Frontend nằm trong:

```text
src/main/resources/META-INF/resources
```

Quarkus serve thư mục này làm static web root.

## Trang đã thiết kế

| File | Mục đích |
| --- | --- |
| `index.html` | Trang chủ, banner, tìm kiếm, phòng nổi bật, phòng mới, khu vực nổi tiếng, footer |
| `register.html` | Form đăng ký người thuê hoặc người cho thuê |
| `login.html` | Form đăng nhập |
| `rooms.html` | Danh sách phòng, search bar, filter panel, room cards |
| `room-detail.html` | Gallery ảnh, thông tin phòng, tiện ích, nội quy, bản đồ, thông tin chủ trọ |
| `profile.html` | Thông tin cá nhân, cập nhật hồ sơ, đổi mật khẩu, modal logout |
| `tenant-dashboard.html` | Dashboard người thuê, phòng yêu thích, yêu cầu thuê, lịch xem, thông báo, form yêu cầu |
| `landlord-dashboard.html` | Dashboard chủ trọ, quản lý phòng, đăng tin, yêu cầu thuê, lịch xem, khách thuê |
| `admin-dashboard.html` | Dashboard admin, quản lý user, chủ trọ, duyệt tin, báo cáo, thống kê |

## Thiết kế

- Màu chủ đạo xanh lá/xanh dương, nền trắng và xám nhạt.
- Nút hành động chính dùng màu cam.
- Card phòng có ảnh lớn, giá nổi bật, trạng thái và tiện ích.
- Form có label rõ, input cao dễ thao tác.
- Dashboard dùng sidebar bên trái trên desktop, chuyển thành layout một cột trên mobile.
- Responsive qua breakpoint `1024px`, `760px`, `480px`.

## Kết nối API

Các form hiện là HTML prototype. Khi tích hợp JavaScript hoặc template engine, map như sau:

| UI | API |
| --- | --- |
| Đăng ký | `POST /api/auth/register` |
| Đăng nhập | `POST /api/auth/login` |
| Tìm phòng | `GET /api/rooms` |
| Chi tiết phòng | `GET /api/rooms/{id}` |
| Gửi yêu cầu thuê | `POST /api/rental-requests` |
| Đặt lịch xem phòng | `POST /api/viewing-appointments` |
| Lưu yêu thích | `POST /api/favorite-rooms/{roomId}` |
| Đăng tin phòng | `POST /api/rooms` |
| Admin duyệt tin | `PUT /api/admin/rooms/{id}/approve` |
