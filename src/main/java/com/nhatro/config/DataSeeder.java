package com.nhatro.config;

import com.nhatro.entity.ApprovalStatus;
import com.nhatro.entity.Role;
import com.nhatro.entity.Room;
import com.nhatro.entity.RoomImage;
import com.nhatro.entity.RoomReview;
import com.nhatro.entity.RoomStatus;
import com.nhatro.entity.User;
import com.nhatro.entity.UserStatus;
import com.nhatro.repository.RoomImageRepository;
import com.nhatro.repository.RoomRepository;
import com.nhatro.repository.RoomReviewRepository;
import com.nhatro.repository.UserRepository;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@ApplicationScoped
public class DataSeeder {
    private static final String SEED_EMAIL_DOMAIN = "@nhatro-hanoi.local";
    private static final String DEFAULT_PASSWORD = "123456";

    private static final String[] LANDLORD_NAMES = {
            "Nguyễn Văn Huy",
            "Trần Minh Anh",
            "Lê Hoàng Nam",
            "Phạm Thu Trang",
            "Đỗ Quốc Việt",
            "Bùi Gia Hân",
            "Hoàng Đức Long",
            "Đặng Thanh Mai",
            "Vũ Bảo Khanh",
            "Phan Ngọc Linh"
    };

    private static final String[][] DISTRICT_DATA = {
            {"Cầu Giấy", "Trần Duy Hưng", "Xuân Thủy", "Duy Tân", "Nguyễn Khang"},
            {"Đống Đa", "Chùa Bộc", "Tây Sơn", "Phạm Ngọc Thạch", "Thái Hà"},
            {"Hai Bà Trưng", "Minh Khai", "Bạch Mai", "Trần Đại Nghĩa", "Lê Thanh Nghị"},
            {"Thanh Xuân", "Nguyễn Trãi", "Khuất Duy Tiến", "Vũ Trọng Phụng", "Nguyễn Xiển"},
            {"Tây Hồ", "Xuân Diệu", "Âu Cơ", "Võ Chí Công", "Đặng Thai Mai"},
            {"Nam Từ Liêm", "Mễ Trì", "Đình Thôn", "Phạm Hùng", "Hàm Nghi"},
            {"Hà Đông", "Quang Trung", "Tố Hữu", "Vạn Phúc", "Nguyễn Văn Lộc"},
            {"Hoàng Mai", "Giải Phóng", "Lĩnh Nam", "Trương Định", "Tân Mai"},
            {"Ba Đình", "Đội Cấn", "Kim Mã", "Giảng Võ", "Ngọc Hà"},
            {"Long Biên", "Nguyễn Văn Cừ", "Ngọc Lâm", "Cổ Linh", "Sài Đồng"}
    };

    private static final String[] ROOM_TYPES = {
            "Studio full nội thất",
            "Phòng khép kín có cửa sổ",
            "Căn hộ mini có gác",
            "Phòng ban công thoáng",
            "Phòng riêng gần đại học",
            "Studio mới xây",
            "Phòng trọ cao cấp",
            "Căn hộ dịch vụ mini",
            "Phòng có bếp riêng",
            "Phòng sạch đẹp giờ tự do"
    };

    private static final String[] AMENITIES = {
            "Máy lạnh, giường, tủ quần áo, bàn học, wifi, camera, giữ xe",
            "Bếp riêng, máy giặt chung, nóng lạnh, wifi, khóa vân tay",
            "Thang máy, camera, bảo vệ, máy lạnh, tủ lạnh, ban công",
            "Giờ giấc tự do, vệ sinh khép kín, bếp riêng, chỗ để xe",
            "Full nội thất, cửa sổ lớn, máy giặt, máy sấy, internet tốc độ cao"
    };

    private static final String[] RULES = {
            "Giữ trật tự sau 22:00, không hút thuốc trong phòng, không nuôi thú cưng lớn.",
            "Không tổ chức tiệc ồn ào, đăng ký tạm trú đầy đủ, giữ vệ sinh khu chung.",
            "Thanh toán tiền phòng trước ngày 5 hàng tháng, báo trước 30 ngày khi trả phòng.",
            "Khách qua đêm cần báo chủ nhà, không tự ý sửa chữa hệ thống điện nước.",
            "Không để xe sai khu vực, khóa cửa cẩn thận, tiết kiệm điện nước."
    };

    private static final String[] FURNITURE_TYPES = {
            "Full nội thất",
            "Cơ bản",
            "Không nội thất"
    };

    private static final String[] IMAGE_URLS = {
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85",
            "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=900&q=85",
            "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fit=crop&w=900&q=85",
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85",
            "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=85",
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=85",
            "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=900&q=85",
            "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=900&q=85"
    };

    @Inject
    UserRepository userRepository;

    @Inject
    RoomRepository roomRepository;

    @Inject
    RoomImageRepository roomImageRepository;

    @Inject
    RoomReviewRepository roomReviewRepository;

    @Transactional
    void seed(@Observes StartupEvent event) {
        seedCoreUsers();
        List<User> landlords = seedLandlords();
        seedRooms(landlords);
        seedRoomReviews();
    }

    private void seedCoreUsers() {
        String passwordHash = BcryptUtil.bcryptHash(DEFAULT_PASSWORD);
        createSeedUser("admin" + SEED_EMAIL_DOMAIN, "Quan tri vien", "0988999000", Role.ADMIN, passwordHash, "https://i.pravatar.cc/240?img=12");
        createSeedUser("tenant01" + SEED_EMAIL_DOMAIN, "Nguyen Hoang Linh", "0988999001", Role.USER, passwordHash, "https://i.pravatar.cc/240?img=5");
    }

    private void createSeedUser(String email, String fullName, String phone, Role role, String passwordHash, String avatar) {
        if (userRepository.existsByEmail(email)) {
            return;
        }

        User user = new User();
        user.fullName = fullName;
        user.email = email;
        user.phone = phone;
        user.citizenId = citizenIdFromPhone(phone);
        user.password = passwordHash;
        user.avatar = avatar;
        user.role = role;
        user.status = UserStatus.ACTIVE;
        userRepository.persist(user);
    }

    private List<User> seedLandlords() {
        String passwordHash = BcryptUtil.bcryptHash(DEFAULT_PASSWORD);
        for (int i = 0; i < LANDLORD_NAMES.length; i++) {
            String email = "landlord%02d%s".formatted(i + 1, SEED_EMAIL_DOMAIN);
            String phone = "09880000%02d".formatted(i + 1);
            if (userRepository.existsByEmail(email)) {
                continue;
            }

            User user = new User();
            user.fullName = LANDLORD_NAMES[i];
            user.email = email;
            user.phone = phone;
            user.citizenId = citizenIdFromPhone(phone);
            user.password = passwordHash;
            user.avatar = "https://i.pravatar.cc/240?img=" + (20 + i);
            user.role = Role.LANDLORD;
            user.status = UserStatus.ACTIVE;
            userRepository.persist(user);
        }

        return userRepository.find("email like ?1 order by email", "%" + SEED_EMAIL_DOMAIN)
                .list();
    }

    private String citizenIdFromPhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        String suffix = digits.length() > 9 ? digits.substring(digits.length() - 9) : digits;
        return "001" + "0".repeat(Math.max(0, 9 - suffix.length())) + suffix;
    }

    private void seedRooms(List<User> landlords) {
        if (landlords.size() < LANDLORD_NAMES.length) {
            return;
        }

        for (int i = 0; i < 100; i++) {
            RoomDraft draft = roomDraft(i);
            if (roomRepository.count("title = ?1 and address = ?2", draft.title(), draft.address()) > 0) {
                continue;
            }

            Room room = new Room();
            room.landlord = landlords.get(i % landlords.size());
            room.title = draft.title();
            room.price = draft.price();
            room.deposit = draft.deposit();
            room.area = draft.area();
            room.address = draft.address();
            room.description = draft.description();
            room.amenities = draft.amenities();
            room.rules = draft.rules();
            room.furnitureType = draft.furnitureType();
            room.status = i % 13 == 0 ? RoomStatus.RENTED : RoomStatus.AVAILABLE;
            room.approvalStatus = ApprovalStatus.APPROVED;
            room.latitude = draft.latitude();
            room.longitude = draft.longitude();
            roomRepository.persist(room);

            persistImage(room, IMAGE_URLS[i % IMAGE_URLS.length]);
            persistImage(room, IMAGE_URLS[(i + 3) % IMAGE_URLS.length]);
        }
    }

    private void seedRoomReviews() {
        List<Room> rooms = roomRepository.findAll().list();
        if (rooms.isEmpty()) {
            return;
        }

        String[] reviewerNames = {
                "Nguyen Hoang Linh",
                "Tran Gia Han",
                "Pham Minh Duc",
                "Le Hoang Nam",
                "Vu Hai Anh",
                "Do Minh Chau",
                "Bui Thanh Tung",
                "Dang Ngoc Mai"
        };
        String[] comments = {
                "Phong sach, dung thong tin va chu nha ho tro nhanh.",
                "Vi tri thuan tien, gia phu hop so voi khu vuc.",
                "Anh phong gan voi thuc te, dat lich xem phong de dang.",
                "Tien ich day du, phu hop sinh vien va nguoi di lam."
        };

        for (int i = 0; i < rooms.size(); i++) {
            Room room = rooms.get(i);
            if (roomReviewRepository.countByRoom(room) > 0) {
                continue;
            }

            int reviewCount = 3 + (i % 7);
            for (int j = 0; j < reviewCount; j++) {
                RoomReview review = new RoomReview();
                review.room = room;
                review.reviewerName = reviewerNames[(i + j) % reviewerNames.length];
                review.rating = (byte) seededRating(i, j);
                review.comment = comments[(i + j) % comments.length];
                roomReviewRepository.persist(review);
            }
        }
    }

    private int seededRating(int roomIndex, int reviewIndex) {
        int[] ratings = {5, 5, 4, 5, 4, 3, 5};
        return ratings[(roomIndex + reviewIndex) % ratings.length];
    }

    private RoomDraft roomDraft(int index) {
        String[] district = DISTRICT_DATA[index % DISTRICT_DATA.length];
        String districtName = district[0];
        String street = district[1 + (index / DISTRICT_DATA.length) % 4];
        String roomType = ROOM_TYPES[index % ROOM_TYPES.length];
        int houseNumber = 12 + (index * 7) % 180;
        int laneNumber = 3 + (index * 5) % 90;
        double area = 18 + (index % 9) * 3.5;
        BigDecimal price = priceFor(index, districtName, area);
        String furnitureType = FURNITURE_TYPES[index % FURNITURE_TYPES.length];
        String title = "%s %s, gần %s".formatted(roomType, districtName, landmarkFor(districtName));
        String address = "Số %d ngõ %d %s, %s, Hà Nội".formatted(houseNumber, laneNumber, street, districtName);
        String description = "%s diện tích %.1f m2 tại %s. Phòng phù hợp sinh viên, nhân viên văn phòng, di chuyển thuận tiện tới trường học, văn phòng và bến xe bus.".formatted(roomType, area, districtName);
        double lat = 21.0285 + ((index % 10) - 5) * 0.008 + (index / 10) * 0.0005;
        double lng = 105.8542 + ((index % 8) - 4) * 0.009 + (index / 8) * 0.0004;

        return new RoomDraft(
                title,
                price,
                price,
                area,
                address,
                description,
                AMENITIES[index % AMENITIES.length],
                RULES[index % RULES.length],
                furnitureType,
                round(lat),
                round(lng)
        );
    }

    private BigDecimal priceFor(int index, String districtName, double area) {
        double base = switch (districtName) {
            case "Tây Hồ", "Ba Đình" -> 4_800_000;
            case "Cầu Giấy", "Đống Đa", "Hai Bà Trưng" -> 4_200_000;
            case "Nam Từ Liêm", "Thanh Xuân" -> 3_900_000;
            case "Hà Đông", "Hoàng Mai", "Long Biên" -> 3_200_000;
            default -> 3_600_000;
        };
        double value = base + area * 55_000 + (index % 5) * 180_000;
        return BigDecimal.valueOf(Math.round(value / 10000) * 10000L);
    }

    private String landmarkFor(String districtName) {
        return switch (districtName) {
            case "Cầu Giấy" -> "Đại học Quốc gia";
            case "Đống Đa" -> "Học viện Ngân hàng";
            case "Hai Bà Trưng" -> "Đại học Kinh tế Quốc dân";
            case "Thanh Xuân" -> "Đại học Hà Nội";
            case "Tây Hồ" -> "Hồ Tây";
            case "Nam Từ Liêm" -> "Mỹ Đình";
            case "Hà Đông" -> "tuyến Metro Hà Đông";
            case "Hoàng Mai" -> "bến xe Giáp Bát";
            case "Ba Đình" -> "Kim Mã";
            case "Long Biên" -> "cầu Chương Dương";
            default -> "trung tâm Hà Nội";
        };
    }

    private void persistImage(Room room, String imageUrl) {
        RoomImage image = new RoomImage();
        image.room = room;
        image.imageUrl = imageUrl;
        roomImageRepository.persist(image);
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(6, RoundingMode.HALF_UP).doubleValue();
    }

    private record RoomDraft(
            String title,
            BigDecimal price,
            BigDecimal deposit,
            Double area,
            String address,
            String description,
            String amenities,
            String rules,
            String furnitureType,
            Double latitude,
            Double longitude
    ) {
    }
}
