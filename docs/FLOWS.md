# Luồng hoạt động chính

## Khách chưa đăng nhập

1. Vào trang chủ.
2. Tìm kiếm phòng theo từ khóa, khu vực, giá thuê, diện tích.
3. Xem danh sách phòng đã được duyệt.
4. Xem chi tiết phòng.
5. Đăng nhập hoặc đăng ký để lưu yêu thích, gửi yêu cầu thuê hoặc đặt lịch xem.

## Người thuê trọ

1. Đăng ký role `USER` hoặc đăng nhập.
2. Lưu phòng yêu thích qua `/api/favorite-rooms/{roomId}`.
3. Gửi yêu cầu thuê qua `/api/rental-requests`.
4. Đặt lịch xem phòng qua `/api/viewing-appointments`.
5. Theo dõi trạng thái `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`.
6. Nhận thông báo khi chủ trọ chấp nhận hoặc từ chối.

## Người cho thuê

1. Đăng ký role `LANDLORD`.
2. Đăng tin phòng mới qua `/api/rooms`.
3. Tin mới ở trạng thái `PENDING` và chưa hiển thị công khai.
4. Sau khi admin duyệt, tin chuyển sang `APPROVED`.
5. Chủ trọ xem yêu cầu thuê và lịch xem qua endpoint `/api/landlord/...`.
6. Chấp nhận hoặc từ chối yêu cầu, hệ thống tạo thông báo cho người thuê.

## Quản trị viên

1. Đăng nhập tài khoản `ADMIN`.
2. Xem thống kê qua `/api/admin/statistics`.
3. Quản lý người dùng: khóa, mở khóa, xóa tài khoản vi phạm.
4. Kiểm duyệt tin chờ duyệt.
5. Duyệt tin để phòng hiển thị công khai hoặc từ chối để chủ trọ chỉnh sửa.
6. Xem và xử lý báo cáo vi phạm.

## Thông báo tự động

Hệ thống tạo notification khi:

- Có yêu cầu thuê mới gửi tới chủ trọ.
- Người thuê hủy yêu cầu thuê.
- Yêu cầu thuê được chấp nhận hoặc từ chối.
- Có lịch xem phòng mới gửi tới chủ trọ.
- Lịch xem được chấp nhận hoặc từ chối.
- Tin đăng được duyệt hoặc bị từ chối.
