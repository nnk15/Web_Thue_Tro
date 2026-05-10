# Database MySQL

Schema chính nằm ở:

```text
src/main/resources/db/migration/V1__init.sql
```

Flyway tự chạy migration khi app khởi động.

## Bảng chính

| Bảng | Mục đích |
| --- | --- |
| `users` | Tài khoản người thuê, chủ trọ, quản trị viên |
| `rooms` | Tin phòng trọ, trạng thái phòng và trạng thái kiểm duyệt |
| `room_images` | Danh sách ảnh phòng |
| `room_videos` | Danh sách video phòng |
| `rental_requests` | Yêu cầu thuê phòng |
| `viewing_appointments` | Lịch xem phòng |
| `favorite_rooms` | Phòng yêu thích |
| `notifications` | Thông báo trong hệ thống |
| `violation_reports` | Báo cáo vi phạm |

## Enum nghiệp vụ

```text
Role: USER, LANDLORD, ADMIN
UserStatus: ACTIVE, LOCKED
RoomStatus: AVAILABLE, RENTED, HIDDEN
ApprovalStatus: PENDING, APPROVED, REJECTED
RequestStatus: PENDING, ACCEPTED, REJECTED, CANCELLED
ReportStatus: PENDING, RESOLVED, REJECTED
```

## Quan hệ chính

| Quan hệ | Kiểu |
| --- | --- |
| `users` 1 - N `rooms` | Một chủ trọ có nhiều phòng |
| `rooms` 1 - N `room_images` | Một phòng có nhiều ảnh |
| `rooms` 1 - N `room_videos` | Một phòng có nhiều video |
| `users` 1 - N `rental_requests` | Một người thuê có nhiều yêu cầu |
| `rooms` 1 - N `rental_requests` | Một phòng có nhiều yêu cầu thuê |
| `users` N - N `rooms` qua `favorite_rooms` | Người thuê lưu phòng yêu thích |
| `users` 1 - N `notifications` | Một người dùng có nhiều thông báo |

## Ghi chú thiết kế

- `rooms.approval_status = PENDING` khi chủ trọ đăng hoặc cập nhật tin.
- `rooms.status = HIDDEN` dùng cho ẩn tin khỏi danh sách công khai.
- `rental_requests.status = ACCEPTED` sẽ chuyển phòng sang `RENTED` trong MVP.
- `favorite_rooms` có unique key `(user_id, room_id)` để tránh lưu trùng.
