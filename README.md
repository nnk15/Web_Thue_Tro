# NhaTro Finder MVP

MVP website tìm kiếm và thuê phòng trọ tại Việt Nam.

- Frontend: HTML/CSS thuần, responsive, dashboard có sidebar.
- Backend: Java 21+, Quarkus, Jakarta REST, Hibernate ORM Panache.
- Database: MySQL, schema tự chạy bằng Flyway.
- Auth: JWT HMAC tự triển khai ở tầng MVP, password mã hóa bằng BCrypt.

## Cấu trúc thư mục

```text
src/main/java/com/nhatro
  config/        Exception mapper và cấu hình dùng chung
  dto/           Request/response DTO
  entity/        JPA entities và enum trạng thái
  repository/    Panache repositories
  resource/      REST API resources
  security/      JWT filter, JWT service, request auth context
  service/       Nghiệp vụ hệ thống

src/main/resources
  application.properties
  db/migration/V1__init.sql
  META-INF/resources/
    index.html
    login.html
    register.html
    rooms.html
    room-detail.html
    profile.html
    tenant-dashboard.html
    landlord-dashboard.html
    admin-dashboard.html
    assets/css/styles.css

docs/
  API.md
  DATABASE.md
  FLOWS.md
  FRONTEND.md
```

## Cấu hình MySQL

Mặc định app dùng:

```properties
DB_URL=jdbc:mysql://localhost:3306/nhatro_mvp?createDatabaseIfNotExist=true&useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Ho_Chi_Minh
DB_USERNAME=root
DB_PASSWORD=123456
JWT_SECRET=change-this-secret-in-production-at-least-32-characters
```

Có thể override bằng biến môi trường trước khi chạy.

## Chạy ứng dụng

Nếu đã có Maven trong PATH:

```bash
mvn quarkus:dev
```

Trên máy hiện tại có Maven distribution trong `.m2/wrapper`, có thể chạy bằng PowerShell:

```powershell
& 'C:\Users\Admin\.m2\wrapper\dists\apache-maven-3.9.15\0226a00282e400185496f3b60ec5a3f029cbdc6893912937d4876d57695224e1\bin\mvn.cmd' quarkus:dev
```

Build package:

```powershell
& 'C:\Users\Admin\.m2\wrapper\dists\apache-maven-3.9.15\0226a00282e400185496f3b60ec5a3f029cbdc6893912937d4876d57695224e1\bin\mvn.cmd' -DskipTests package
```

Frontend tĩnh được serve tại:

```text
http://localhost:8080/
```

## Tài khoản admin đầu tiên

MVP không cho tự đăng ký role `ADMIN`. Tạo admin bằng SQL sau khi Flyway tạo bảng:

```sql
INSERT INTO users(full_name, email, phone, password, role, status)
VALUES ('Admin', 'admin@nhatro.local', '0900000000', '<bcrypt_hash>', 'ADMIN', 'ACTIVE');
```

Có thể tạo hash bằng endpoint đăng ký tạm với role `USER`, copy password hash trong DB, sau đó đổi role sang `ADMIN`.

## Tài liệu

- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Luồng hoạt động](docs/FLOWS.md)
- [Frontend](docs/FRONTEND.md)
