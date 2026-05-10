# REST API

Base URL:

```text
/api
```

Các endpoint bảo vệ cần header:

```http
Authorization: Bearer <jwt>
```

## Authentication

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/api/auth/register` | Đăng ký `USER` hoặc `LANDLORD` |
| POST | `/api/auth/login` | Đăng nhập bằng email hoặc số điện thoại |
| POST | `/api/auth/logout` | Stateless logout, client xóa JWT |

Payload đăng ký:

```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "phone": "0901234567",
  "password": "secret123",
  "confirmPassword": "secret123",
  "role": "USER"
}
```

## User

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/api/users/profile` | Authenticated |
| PUT | `/api/users/profile` | Authenticated |
| PUT | `/api/users/change-password` | Authenticated |

## Room

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/api/rooms` | Public |
| GET | `/api/rooms/{id}` | Public nếu phòng đã duyệt |
| GET | `/api/rooms/my` | `LANDLORD`, `ADMIN` |
| POST | `/api/rooms` | `LANDLORD`, `ADMIN` |
| PUT | `/api/rooms/{id}` | Chủ phòng hoặc `ADMIN` |
| DELETE | `/api/rooms/{id}` | Chủ phòng hoặc `ADMIN` |
| PUT | `/api/rooms/{id}/hide` | Chủ phòng hoặc `ADMIN` |
| PUT | `/api/rooms/{id}/show` | Chủ phòng hoặc `ADMIN` |

Query tìm kiếm:

```text
GET /api/rooms?keyword=studio&location=Binh%20Thanh&minPrice=3000000&maxPrice=6000000&minArea=20&maxArea=35&status=AVAILABLE&furnitureType=full&page=0&size=12
```

Payload thêm phòng:

```json
{
  "title": "Studio full nội thất Hai Bà Trưng",
  "price": 4500000,
  "deposit": 4500000,
  "area": 28,
  "address": "Hai Bà Trưng, Hà Nội",
  "description": "Phòng mới, có bếp riêng",
  "amenities": "Máy lạnh, tủ lạnh, giữ xe",
  "rules": "Không gây ồn sau 22:00",
  "furnitureType": "Full nội thất",
  "status": "AVAILABLE",
  "latitude": 10.7829,
  "longitude": 106.6871,
  "imageUrls": ["https://example.com/room.jpg"],
  "videoUrls": []
}
```

## Rental Request

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/api/rental-requests` | `USER` |
| GET | `/api/rental-requests/my` | Authenticated |
| PUT | `/api/rental-requests/{id}/cancel` | Chủ yêu cầu |
| GET | `/api/landlord/rental-requests` | `LANDLORD`, `ADMIN` |
| PUT | `/api/rental-requests/{id}/accept` | Chủ phòng hoặc `ADMIN` |
| PUT | `/api/rental-requests/{id}/reject` | Chủ phòng hoặc `ADMIN` |

## Viewing Appointment

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/api/viewing-appointments` | `USER` |
| GET | `/api/viewing-appointments/my` | Authenticated |
| PUT | `/api/viewing-appointments/{id}/cancel` | Chủ lịch hẹn |
| GET | `/api/landlord/viewing-appointments` | `LANDLORD`, `ADMIN` |
| PUT | `/api/viewing-appointments/{id}/accept` | Chủ phòng hoặc `ADMIN` |
| PUT | `/api/viewing-appointments/{id}/reject` | Chủ phòng hoặc `ADMIN` |

## Favorite Room

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/api/favorite-rooms/{roomId}` | `USER` |
| GET | `/api/favorite-rooms` | `USER` |
| DELETE | `/api/favorite-rooms/{roomId}` | `USER` |

## Admin

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/api/admin/users?keyword=` | `ADMIN` |
| PUT | `/api/admin/users/{id}/lock` | `ADMIN` |
| PUT | `/api/admin/users/{id}/unlock` | `ADMIN` |
| DELETE | `/api/admin/users/{id}` | `ADMIN` |
| GET | `/api/admin/rooms/pending` | `ADMIN` |
| PUT | `/api/admin/rooms/{id}/approve` | `ADMIN` |
| PUT | `/api/admin/rooms/{id}/reject` | `ADMIN` |
| GET | `/api/admin/statistics` | `ADMIN` |
| GET | `/api/admin/violation-reports` | `ADMIN` |
| PUT | `/api/admin/violation-reports/{id}/resolve` | `ADMIN` |

## Notifications

| Method | Endpoint | Role |
| --- | --- | --- |
| GET | `/api/notifications` | Authenticated |
| PUT | `/api/notifications/{id}/read` | Chủ thông báo |

## Violation Reports

| Method | Endpoint | Role |
| --- | --- | --- |
| POST | `/api/violation-reports` | Authenticated |
