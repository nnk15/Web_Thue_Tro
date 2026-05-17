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
    private static final int ORIGINAL_ROOM_COUNT = 100;
    private static final int AFFORDABLE_ROOM_COUNT = 100;
    private static final String AFFORDABLE_ROOM_PREFIX = "Phòng giá tốt";

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
            "Phan Ngọc Linh",
            "Nguyễn Hải Đăng",
            "Trịnh Mai Phương",
            "Cao Tuấn Kiệt",
            "Mai Thanh Hà",
            "Tạ Đức Minh",
            "Ngô Hương Giang",
            "Đinh Quang Hưng",
            "Lý Bảo Ngọc",
            "Đào Minh Khang",
            "Hà Thu Uyên"
    };

    private static final Object[][] REAL_ADDRESS_DATA = {
            {"Cầu Giấy", "Xuân Thủy, Cầu Giấy, Hà Nội", 21.037900, 105.782400},
            {"Cầu Giấy", "Phạm Văn Bạch, Cầu Giấy, Hà Nội", 21.029700, 105.790800},
            {"Cầu Giấy", "Trần Duy Hưng, Cầu Giấy, Hà Nội", 21.014000, 105.800500},
            {"Cầu Giấy", "Cầu Giấy, Cầu Giấy, Hà Nội", 21.032300, 105.801100},
            {"Đống Đa", "Chùa Bộc, Đống Đa, Hà Nội", 21.008100, 105.831500},
            {"Đống Đa", "Tây Sơn, Đống Đa, Hà Nội", 21.004900, 105.824100},
            {"Đống Đa", "Phạm Ngọc Thạch, Đống Đa, Hà Nội", 21.006700, 105.831900},
            {"Đống Đa", "Thái Hà, Đống Đa, Hà Nội", 21.011100, 105.819500},
            {"Hai Bà Trưng", "Đại Cồ Việt, Hai Bà Trưng, Hà Nội", 21.006000, 105.843400},
            {"Hai Bà Trưng", "Giải Phóng, Hai Bà Trưng, Hà Nội", 21.002700, 105.841300},
            {"Hai Bà Trưng", "Minh Khai, Hai Bà Trưng, Hà Nội", 20.996000, 105.860300},
            {"Hai Bà Trưng", "Trần Đại Nghĩa, Hai Bà Trưng, Hà Nội", 21.003400, 105.846700},
            {"Thanh Xuân", "Nguyễn Trãi, Thanh Xuân, Hà Nội", 20.996900, 105.806200},
            {"Thanh Xuân", "Khuất Duy Tiến, Thanh Xuân, Hà Nội", 21.004900, 105.800000},
            {"Thanh Xuân", "Vũ Trọng Phụng, Thanh Xuân, Hà Nội", 20.999700, 105.807800},
            {"Thanh Xuân", "Nguyễn Xiển, Thanh Xuân, Hà Nội", 20.983500, 105.801700},
            {"Tây Hồ", "Xuân Diệu, Tây Hồ, Hà Nội", 21.062000, 105.827200},
            {"Tây Hồ", "Âu Cơ, Tây Hồ, Hà Nội", 21.064500, 105.823000},
            {"Tây Hồ", "Võ Chí Công, Tây Hồ, Hà Nội", 21.074300, 105.808600},
            {"Tây Hồ", "Đặng Thai Mai, Tây Hồ, Hà Nội", 21.061400, 105.826500},
            {"Nam Từ Liêm", "Phạm Hùng, Nam Từ Liêm, Hà Nội", 21.016800, 105.784600},
            {"Nam Từ Liêm", "Mễ Trì, Nam Từ Liêm, Hà Nội", 21.013600, 105.778600},
            {"Nam Từ Liêm", "Hàm Nghi, Nam Từ Liêm, Hà Nội", 21.030500, 105.775200},
            {"Nam Từ Liêm", "Đình Thôn, Nam Từ Liêm, Hà Nội", 21.020900, 105.777700},
            {"Hà Đông", "Quang Trung, Hà Đông, Hà Nội", 20.971500, 105.775700},
            {"Hà Đông", "Tố Hữu, Hà Đông, Hà Nội", 20.998500, 105.790000},
            {"Hà Đông", "Vạn Phúc, Hà Đông, Hà Nội", 20.980400, 105.775600},
            {"Hà Đông", "Nguyễn Văn Lộc, Hà Đông, Hà Nội", 20.979100, 105.787300},
            {"Hoàng Mai", "Giải Phóng, Hoàng Mai, Hà Nội", 20.971000, 105.844900},
            {"Hoàng Mai", "Lĩnh Nam, Hoàng Mai, Hà Nội", 20.986800, 105.876400},
            {"Hoàng Mai", "Trương Định, Hoàng Mai, Hà Nội", 20.978400, 105.847500},
            {"Hoàng Mai", "Tân Mai, Hoàng Mai, Hà Nội", 20.983200, 105.852200},
            {"Ba Đình", "Đội Cấn, Ba Đình, Hà Nội", 21.035800, 105.826000},
            {"Ba Đình", "Kim Mã, Ba Đình, Hà Nội", 21.031900, 105.821200},
            {"Ba Đình", "Giảng Võ, Ba Đình, Hà Nội", 21.027500, 105.824500},
            {"Ba Đình", "Ngọc Hà, Ba Đình, Hà Nội", 21.038800, 105.831500},
            {"Long Biên", "Nguyễn Văn Cừ, Long Biên, Hà Nội", 21.043400, 105.874500},
            {"Long Biên", "Ngọc Lâm, Long Biên, Hà Nội", 21.043500, 105.872300},
            {"Long Biên", "Cổ Linh, Long Biên, Hà Nội", 21.025400, 105.895400},
            {"Long Biên", "Sài Đồng, Long Biên, Hà Nội", 21.034900, 105.913300}
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
            "Bếp riêng, máy giặt, nóng lạnh, wifi, khóa vân tay",
            "Thang máy, camera, bảo vệ, máy lạnh, tủ lạnh, ban công",
            "Vệ sinh khép kín, bếp riêng, giữ xe, an ninh 24/7",
            "Máy giặt, máy sấy, wifi, nóng lạnh, ban công"
    };

    private static final String[] RULES = {
            "Giữ trật tự sau 22:00, không hút thuốc trong phòng, không nuôi thú cưng lớn.",
            "Không tổ chức tiệc ồn ào, đăng ký tạm trú đầy đủ, giữ vệ sinh khu chung.",
            "Thanh toán tiền phòng trước ngày 5 hàng tháng, báo trước 30 ngày khi trả phòng.",
            "Khách qua đêm cần báo chủ nhà, không tự ý sửa chữa hệ thống điện nước.",
            "Không để xe sai khu vực, khóa cửa cẩn thận, tiết kiệm điện nước."
    };

    private static final String[] FURNITURE_TYPES = {
            "Đầy đủ",
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

    private static final double[][] AFFORDABLE_COORDINATE_OFFSETS = {
            {-0.0180, -0.0150},
            {-0.0085, 0.0140},
            {0.0065, -0.0115},
            {0.0155, 0.0105},
            {0.0230, -0.0025}
    };

    private static final AffordableDistrictSeed[] AFFORDABLE_DISTRICTS = {
            new AffordableDistrictSeed("Bắc Từ Liêm", "Đại học Mỏ - Địa chất", 21.065000, 105.760000,
                    new String[]{"Cổ Nhuế", "Phạm Văn Đồng", "Hoàng Quốc Việt", "Đức Thắng", "Văn Tiến Dũng"}),
            new AffordableDistrictSeed("Hoàn Kiếm", "Hồ Hoàn Kiếm", 21.028500, 105.854200,
                    new String[]{"Hàng Bài", "Trần Hưng Đạo", "Lý Thường Kiệt", "Hàng Bông", "Phùng Hưng"}),
            new AffordableDistrictSeed("Gia Lâm", "Học viện Nông nghiệp", 21.023400, 105.935200,
                    new String[]{"Ngô Xuân Quảng", "Trâu Quỳ", "Nguyễn Mậu Tài", "Cổ Bi", "Dương Xá"}),
            new AffordableDistrictSeed("Đông Anh", "cầu Nhật Tân", 21.136200, 105.849700,
                    new String[]{"Cao Lỗ", "Uy Nỗ", "Võ Nguyên Giáp", "Nam Hồng", "Vĩnh Ngọc"}),
            new AffordableDistrictSeed("Hoài Đức", "Đại lộ Thăng Long", 21.038400, 105.690400,
                    new String[]{"Quốc lộ 32", "Lai Xá", "An Khánh", "Vân Canh", "Di Trạch"}),
            new AffordableDistrictSeed("Thanh Trì", "bến xe Nước Ngầm", 20.941400, 105.844800,
                    new String[]{"Ngọc Hồi", "Tứ Hiệp", "Cầu Bươu", "Tân Triều", "Văn Điển"}),
            new AffordableDistrictSeed("Sóc Sơn", "sân bay Nội Bài", 21.258400, 105.848600,
                    new String[]{"Võ Nguyên Giáp", "Quốc lộ 3", "Phù Lỗ", "Xuân Giang", "Nội Bài"}),
            new AffordableDistrictSeed("Sơn Tây", "Làng cổ Đường Lâm", 21.140300, 105.506900,
                    new String[]{"Chùa Thông", "Lê Lợi", "Phùng Hưng", "Thanh Mỹ", "Xuân Khanh"}),
            new AffordableDistrictSeed("Ba Vì", "Vườn quốc gia Ba Vì", 21.199300, 105.423200,
                    new String[]{"Tây Đằng", "Tản Lĩnh", "Vật Lại", "Ba Trại", "Minh Quang"}),
            new AffordableDistrictSeed("Chương Mỹ", "Xuân Mai", 20.923700, 105.700600,
                    new String[]{"Xuân Mai", "Chúc Sơn", "Quốc lộ 6", "Đông Phương Yên", "Trường Yên"}),
            new AffordableDistrictSeed("Đan Phượng", "thị trấn Phùng", 21.088100, 105.670800,
                    new String[]{"Phùng", "Tân Hội", "Hồng Hà", "Liên Hà", "Thọ An"}),
            new AffordableDistrictSeed("Mê Linh", "khu công nghiệp Quang Minh", 21.184600, 105.720900,
                    new String[]{"Chi Đông", "Đại Thịnh", "Quang Minh", "Tiền Phong", "Tráng Việt"}),
            new AffordableDistrictSeed("Mỹ Đức", "chùa Hương", 20.706000, 105.741400,
                    new String[]{"Đại Nghĩa", "Hương Sơn", "Tế Tiêu", "An Mỹ", "Phù Lưu Tế"}),
            new AffordableDistrictSeed("Phú Xuyên", "ga Phú Xuyên", 20.733800, 105.912200,
                    new String[]{"Phú Minh", "Phú Xuyên", "Phú Túc", "Đại Xuyên", "Nam Tiến"}),
            new AffordableDistrictSeed("Phúc Thọ", "thị trấn Phúc Thọ", 21.106800, 105.545900,
                    new String[]{"Phúc Thọ", "Gạch", "Võng Xuyên", "Tam Hiệp", "Long Xuyên"}),
            new AffordableDistrictSeed("Quốc Oai", "chùa Thầy", 20.992800, 105.640300,
                    new String[]{"Quốc Oai", "Sài Sơn", "Thạch Thán", "Phú Cát", "Đông Xuân"}),
            new AffordableDistrictSeed("Thạch Thất", "khu công nghệ cao Hòa Lạc", 21.005000, 105.540700,
                    new String[]{"Liên Quan", "Hòa Lạc", "Phùng Xá", "Bình Yên", "Kim Quan"}),
            new AffordableDistrictSeed("Thanh Oai", "Kim Bài", 20.861100, 105.768700,
                    new String[]{"Kim Bài", "Bình Minh", "Cao Viên", "Bích Hòa", "Thanh Cao"}),
            new AffordableDistrictSeed("Thường Tín", "ga Thường Tín", 20.870600, 105.861900,
                    new String[]{"Thường Tín", "Tía", "Hồng Vân", "Ninh Sở", "Vạn Điểm"}),
            new AffordableDistrictSeed("Ứng Hòa", "Vân Đình", 20.730700, 105.777800,
                    new String[]{"Vân Đình", "Hòa Xá", "Đại Hùng", "Trầm Lộng", "Phương Tú"})
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
        normalizeSeedRoomAddresses();
        seedAffordableRooms(landlords);
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

        return userRepository.find("email like ?1 and role = ?2 order by email", "%" + SEED_EMAIL_DOMAIN, Role.LANDLORD)
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

        long existingSeedRooms = roomRepository.count("landlord.email like ?1", "%" + SEED_EMAIL_DOMAIN);
        if (existingSeedRooms >= ORIGINAL_ROOM_COUNT) {
            return;
        }

        for (int i = (int) existingSeedRooms; i < ORIGINAL_ROOM_COUNT; i++) {
            RoomDraft draft = roomDraft(i);
            if (roomRepository.count("landlord.email like ?1 and title = ?2 and address = ?3", "%" + SEED_EMAIL_DOMAIN, draft.title(), draft.address()) > 0) {
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

    private void normalizeSeedRoomAddresses() {
        List<Room> seedRooms = roomRepository.find(
                        "landlord.email like ?1 and title not like ?2 order by id",
                        "%" + SEED_EMAIL_DOMAIN,
                        AFFORDABLE_ROOM_PREFIX + "%")
                .list();
        int count = Math.min(seedRooms.size(), ORIGINAL_ROOM_COUNT);
        for (int i = 0; i < count; i++) {
            Room room = seedRooms.get(i);
            RoomDraft draft = roomDraft(i);
            room.title = draft.title();
            room.address = draft.address();
            room.description = draft.description();
            room.amenities = draft.amenities();
            room.furnitureType = draft.furnitureType();
            room.latitude = draft.latitude();
            room.longitude = draft.longitude();
        }
    }

    private void seedAffordableRooms(List<User> landlords) {
        if (landlords.size() < LANDLORD_NAMES.length) {
            return;
        }

        long existingAffordableRooms = roomRepository.count(
                "landlord.email like ?1 and title like ?2",
                "%" + SEED_EMAIL_DOMAIN,
                AFFORDABLE_ROOM_PREFIX + "%");
        if (existingAffordableRooms >= AFFORDABLE_ROOM_COUNT) {
            return;
        }

        for (int i = (int) existingAffordableRooms; i < AFFORDABLE_ROOM_COUNT; i++) {
            RoomDraft draft = affordableRoomDraft(i);
            if (roomRepository.count(
                    "landlord.email like ?1 and title = ?2 and address = ?3",
                    "%" + SEED_EMAIL_DOMAIN,
                    draft.title(),
                    draft.address()) > 0) {
                continue;
            }

            Room room = new Room();
            room.landlord = landlords.get((i + ORIGINAL_ROOM_COUNT) % landlords.size());
            room.title = draft.title();
            room.price = draft.price();
            room.deposit = draft.deposit();
            room.area = draft.area();
            room.address = draft.address();
            room.description = draft.description();
            room.amenities = draft.amenities();
            room.rules = draft.rules();
            room.furnitureType = draft.furnitureType();
            room.status = RoomStatus.AVAILABLE;
            room.approvalStatus = ApprovalStatus.APPROVED;
            room.latitude = draft.latitude();
            room.longitude = draft.longitude();
            roomRepository.persist(room);

            persistImage(room, IMAGE_URLS[(i + 1) % IMAGE_URLS.length]);
            persistImage(room, IMAGE_URLS[(i + 5) % IMAGE_URLS.length]);
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
        Object[] addressData = REAL_ADDRESS_DATA[index % REAL_ADDRESS_DATA.length];
        String districtName = (String) addressData[0];
        String address = detailedAddress(index, (String) addressData[1]);
        String roomType = ROOM_TYPES[index % ROOM_TYPES.length];
        double area = 18 + (index % 9) * 3.5;
        BigDecimal price = priceFor(index, districtName, area);
        String furnitureType = FURNITURE_TYPES[index % FURNITURE_TYPES.length];
        String title = "%s %s, gần %s".formatted(roomType, districtName, landmarkFor(districtName));
        String description = "%s diện tích %.1f m2 tại %s. Phòng phù hợp sinh viên, nhân viên văn phòng, di chuyển thuận tiện tới trường học, văn phòng và bến xe bus.".formatted(roomType, area, districtName);
        double lat = (Double) addressData[2] + coordinateOffset(index, 3);
        double lng = (Double) addressData[3] + coordinateOffset(index, 7);

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

    private RoomDraft affordableRoomDraft(int index) {
        AffordableDistrictSeed district = AFFORDABLE_DISTRICTS[index / 5 % AFFORDABLE_DISTRICTS.length];
        int roomIndex = index % 5;
        String street = district.streets()[roomIndex];
        double[] offset = AFFORDABLE_COORDINATE_OFFSETS[roomIndex];
        double lat = district.latitude() + offset[0];
        double lng = district.longitude() + offset[1];
        double area = 16 + ((index * 3) % 11) * 1.8;
        BigDecimal price = affordablePriceFor(index);
        String furnitureType = FURNITURE_TYPES[(index + 1) % FURNITURE_TYPES.length];
        String roomType = switch (roomIndex) {
            case 0 -> "Phòng riêng giá tốt";
            case 1 -> "Studio nhỏ gọn";
            case 2 -> "Phòng khép kín";
            case 3 -> "Căn hộ mini tiết kiệm";
            default -> "Phòng trọ sạch đẹp";
        };
        String title = "%s %s tại %s, gần %s".formatted(AFFORDABLE_ROOM_PREFIX, roomType, district.name(), district.landmark());
        String address = affordableAddress(index, street, district.name());
        String description = "%s diện tích %.1f m2 tại %s. Giá thuê phù hợp sinh viên và người đi làm, vị trí tách xa các phòng seed cũ để hiển thị rõ hơn trên bản đồ.".formatted(roomType, area, district.name());

        return new RoomDraft(
                title,
                price,
                price,
                area,
                address,
                description,
                AMENITIES[(index + 2) % AMENITIES.length],
                RULES[(index + 1) % RULES.length],
                furnitureType,
                round(lat),
                round(lng)
        );
    }

    private String detailedAddress(int index, String baseAddress) {
        String[] parts = baseAddress.split(",", 2);
        String street = parts[0].trim();
        String suffix = parts.length > 1 ? ", " + parts[1].trim() : "";
        int houseNumber = 8 + (index * 7) % 190;
        int alley = 12 + (index * 11) % 160;
        int branch = 1 + (index * 5) % 29;

        return switch (index % 4) {
            case 0 -> "Số %d ngõ %d %s%s".formatted(houseNumber, alley, street, suffix);
            case 1 -> "Số %d ngách %d/%d %s%s".formatted(houseNumber, alley, branch, street, suffix);
            case 2 -> "Tòa nhà CT%d, số %d %s%s".formatted(1 + index % 9, houseNumber, street, suffix);
            default -> "Số %d %s%s".formatted(houseNumber, street, suffix);
        };
    }

    private double coordinateOffset(int index, int seed) {
        int horizontal = (index + seed) % 5 - 2;
        int vertical = ((index / 5) + seed) % 5 - 2;
        return horizontal * 0.00035 + vertical * 0.00008;
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

    private BigDecimal affordablePriceFor(int index) {
        long value = 2_000_000L + ((index * 137_000L) % 1_910_000L);
        return BigDecimal.valueOf(Math.round(value / 10000.0) * 10000L);
    }

    private String affordableAddress(int index, String street, String districtName) {
        int houseNumber = 11 + (index * 13) % 220;
        int alley = 21 + (index * 17) % 180;
        return switch (index % 5) {
            case 0 -> "Số %d ngõ %d %s, %s, Hà Nội".formatted(houseNumber, alley, street, districtName);
            case 1 -> "Số %d %s, %s, Hà Nội".formatted(houseNumber, street, districtName);
            case 2 -> "Tòa nhà mini số %d %s, %s, Hà Nội".formatted(houseNumber, street, districtName);
            case 3 -> "Số %d ngách %d/3 %s, %s, Hà Nội".formatted(houseNumber, alley, street, districtName);
            default -> "Cụm trọ số %d %s, %s, Hà Nội".formatted(houseNumber, street, districtName);
        };
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

    private record AffordableDistrictSeed(
            String name,
            String landmark,
            double latitude,
            double longitude,
            String[] streets
    ) {
    }
}
