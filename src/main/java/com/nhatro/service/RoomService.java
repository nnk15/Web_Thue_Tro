package com.nhatro.service;

import com.nhatro.dto.RoomDtos;
import com.nhatro.entity.ApprovalStatus;
import com.nhatro.entity.Role;
import com.nhatro.entity.Room;
import com.nhatro.entity.RoomImage;
import com.nhatro.entity.RoomStatus;
import com.nhatro.entity.RoomVideo;
import com.nhatro.entity.User;
import com.nhatro.repository.RoomImageRepository;
import com.nhatro.repository.RoomRepository;
import com.nhatro.repository.RoomReviewRepository;
import com.nhatro.repository.RoomVideoRepository;
import com.nhatro.security.AuthContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class RoomService {
    @Inject
    RoomRepository roomRepository;

    @Inject
    RoomImageRepository imageRepository;

    @Inject
    RoomVideoRepository videoRepository;

    @Inject
    RoomReviewRepository reviewRepository;

    @Inject
    NotificationService notificationService;

    @Inject
    GeocodingService geocodingService;

    @Inject
    AuthContext authContext;

    @Inject
    EntityManager entityManager;

    @ConfigProperty(name = "app.supported-cities")
    List<String> supportedCities;

    @Transactional
    public RoomDtos.RoomSearchResponse search(
            String keyword,
            String location,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Double minArea,
            Double maxArea,
            RoomStatus status,
            String furnitureType,
            int page,
            int size
    ) {
        Map<String, Object> params = new HashMap<>();
        List<String> conditions = new ArrayList<>();
        conditions.add("r.approvalStatus = :approved");
        conditions.add("r.status = :available");
        params.put("approved", ApprovalStatus.APPROVED);
        params.put("available", RoomStatus.AVAILABLE);
        addSupportedCityConditions(conditions, params);

        if (hasText(keyword)) {
            conditions.add("(lower(r.title) like :keyword or lower(r.address) like :keyword)");
            params.put("keyword", "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%");
        }
        if (hasText(location)) {
            conditions.add("lower(r.address) like :location");
            params.put("location", "%" + location.trim().toLowerCase(Locale.ROOT) + "%");
        }
        if (minPrice != null) {
            conditions.add("r.price >= :minPrice");
            params.put("minPrice", minPrice);
        }
        if (maxPrice != null) {
            conditions.add("r.price <= :maxPrice");
            params.put("maxPrice", maxPrice);
        }
        if (minArea != null) {
            conditions.add("r.area >= :minArea");
            params.put("minArea", minArea);
        }
        if (maxArea != null) {
            conditions.add("r.area <= :maxArea");
            params.put("maxArea", maxArea);
        }
        if (hasText(furnitureType)) {
            conditions.add("lower(r.furnitureType) like :furnitureType");
            params.put("furnitureType", "%" + furnitureType.trim().toLowerCase(Locale.ROOT) + "%");
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String whereClause = String.join(" and ", conditions);
        long total = countRooms(whereClause, params);
        List<Room> rooms = findRoomsWithLandlord(whereClause, params, safePage * safeSize, safeSize);
        return new RoomDtos.RoomSearchResponse(toResponses(rooms), total, safePage, safeSize);
    }

    @Transactional
    public List<RoomDtos.RoomResponse> listMine(User user) {
        Map<String, Object> params = new HashMap<>();
        if (user.role == Role.ADMIN) {
            return toResponses(findRoomsWithLandlord("1 = 1", params));
        }
        params.put("landlord", user);
        return toResponses(findRoomsWithLandlord("r.landlord = :landlord", params));
    }

    @Transactional
    public RoomDtos.RoomResponse get(Long id) {
        Room room = getRoom(id);
        boolean publicVisible = room.approvalStatus == ApprovalStatus.APPROVED
                && room.status == RoomStatus.AVAILABLE
                && isSupportedAddress(room.address);
        boolean ownerOrAdmin = authContext.currentUser()
                .map(user -> user.role == Role.ADMIN || room.landlord.id.equals(user.id))
                .orElse(false);
        if (!publicVisible && !ownerOrAdmin) {
            throw new WebApplicationException("Không tìm thấy phòng trọ", Response.Status.NOT_FOUND);
        }
        return toResponse(room);
    }

    @Transactional
    public RoomDtos.RoomResponse create(RoomDtos.RoomRequest request, User landlord) {
        Room room = new Room();
        room.landlord = landlord;
        applyFields(room, request);
        room.status = request.status() == null ? RoomStatus.AVAILABLE : request.status();
        room.approvalStatus = landlord.role == Role.ADMIN ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING;
        roomRepository.persist(room);
        persistMedia(room, request.imageUrls(), request.videoUrls());

        notificationService.createForAdmins("Có tin đăng mới chờ duyệt", landlord.fullName + " vừa đăng phòng: " + room.title);
        return toResponse(room);
    }

    @Transactional
    public RoomDtos.RoomResponse update(Long id, RoomDtos.RoomRequest request, User user) {
        Room room = getRoom(id);
        ensureOwnerOrAdmin(room, user);
        applyFields(room, request);
        if (request.status() != null) {
            room.status = request.status();
        }
        if (user.role != Role.ADMIN) {
            room.approvalStatus = ApprovalStatus.PENDING;
            notificationService.createForAdmins("Tin đăng cần duyệt lại", user.fullName + " vừa cập nhật phòng: " + room.title);
        }
        replaceMedia(room, request.imageUrls(), request.videoUrls());
        return toResponse(room);
    }

    @Transactional
    public void delete(Long id, User user) {
        Room room = getRoom(id);
        ensureOwnerOrAdmin(room, user);
        roomRepository.delete(room);
    }

    @Transactional
    public RoomDtos.RoomResponse hide(Long id, User user) {
        Room room = getRoom(id);
        ensureOwnerOrAdmin(room, user);
        room.status = RoomStatus.HIDDEN;
        return toResponse(room);
    }

    @Transactional
    public RoomDtos.RoomResponse show(Long id, User user) {
        Room room = getRoom(id);
        ensureOwnerOrAdmin(room, user);
        room.status = RoomStatus.AVAILABLE;
        if (user.role != Role.ADMIN) {
            room.approvalStatus = ApprovalStatus.PENDING;
            notificationService.createForAdmins("Tin đăng cần duyệt lại", user.fullName + " vừa hiện lại phòng: " + room.title);
        }
        return toResponse(room);
    }

    @Transactional
    public List<RoomDtos.RoomResponse> pendingRooms() {
        Map<String, Object> params = new HashMap<>();
        params.put("pending", ApprovalStatus.PENDING);
        return toResponses(findRoomsWithLandlord("r.approvalStatus = :pending", params));
    }

    @Transactional
    public RoomDtos.RoomResponse approve(Long id) {
        Room room = getRoom(id);
        room.approvalStatus = ApprovalStatus.APPROVED;
        if (room.status == RoomStatus.HIDDEN) {
            room.status = RoomStatus.AVAILABLE;
        }
        notificationService.create(room.landlord, "Tin đăng đã được duyệt", "Phòng \"" + room.title + "\" đã hiển thị công khai.");
        return toResponse(room);
    }

    @Transactional
    public RoomDtos.RoomResponse reject(Long id) {
        Room room = getRoom(id);
        room.approvalStatus = ApprovalStatus.REJECTED;
        notificationService.create(room.landlord, "Tin đăng bị từ chối", "Phòng \"" + room.title + "\" chưa đạt yêu cầu kiểm duyệt.");
        return toResponse(room);
    }

    public Room getRoom(Long id) {
        return roomRepository.findByIdOptional(id)
                .orElseThrow(() -> new WebApplicationException("Không tìm thấy phòng trọ", Response.Status.NOT_FOUND));
    }

    public RoomDtos.RoomResponse toResponse(Room room) {
        return toResponses(List.of(room)).get(0);
    }

    public List<RoomDtos.RoomResponse> toResponses(List<Room> rooms) {
        if (rooms == null || rooms.isEmpty()) {
            return List.of();
        }

        List<Long> roomIds = rooms.stream()
                .map(room -> room.id)
                .filter(id -> id != null)
                .distinct()
                .toList();
        Map<Long, List<String>> imageUrlsByRoom = loadImageUrls(roomIds);
        Map<Long, List<String>> videoUrlsByRoom = loadVideoUrls(roomIds);
        Map<Long, RoomReviewRepository.RoomReviewStats> reviewStatsByRoom = reviewRepository.statsByRoomIds(roomIds)
                .stream()
                .collect(Collectors.toMap(RoomReviewRepository.RoomReviewStats::roomId, Function.identity()));

        return rooms.stream()
                .map(room -> {
                    RoomReviewRepository.RoomReviewStats reviewStats = reviewStatsByRoom.get(room.id);
                    long reviewCount = reviewStats == null ? 0 : reviewStats.reviewCount();
                    Double averageRating = reviewStats == null ? null : roundRating(reviewStats.averageRating());
                    return RoomDtos.RoomResponse.from(
                            room,
                            imageUrlsByRoom.getOrDefault(room.id, List.of()),
                            videoUrlsByRoom.getOrDefault(room.id, List.of()),
                            averageRating,
                            reviewCount
                    );
                })
                .toList();
    }

    private void applyFields(Room room, RoomDtos.RoomRequest request) {
        if (!isSupportedAddress(request.address())) {
            throw new WebApplicationException("Hiện hệ thống chỉ hỗ trợ phòng trọ tại: " + supportedCityMessage() + ". Vui lòng nhập địa chỉ thuộc khu vực được hỗ trợ.", Response.Status.BAD_REQUEST);
        }
        room.title = request.title().trim();
        room.price = request.price();
        room.deposit = request.deposit();
        room.area = request.area();
        String nextAddress = request.address().trim();
        boolean addressChanged = room.id == null || !nextAddress.equals(room.address);
        room.address = nextAddress;
        room.description = request.description();
        room.amenities = request.amenities();
        room.rules = request.rules();
        room.furnitureType = request.furnitureType();
        applyCoordinates(room, request, addressChanged);
    }

    private void applyCoordinates(Room room, RoomDtos.RoomRequest request, boolean addressChanged) {
        Optional<GeocodingService.GeocodeResult> geocoded = geocodingService.geocode(room.address);
        if (geocoded.isPresent()) {
            GeocodingService.GeocodeResult point = geocoded.get();
            room.latitude = point.latitude();
            room.longitude = point.longitude();
            return;
        }

        if (request.latitude() != null && request.longitude() != null) {
            room.latitude = request.latitude();
            room.longitude = request.longitude();
            return;
        }

        if (addressChanged) {
            room.latitude = null;
            room.longitude = null;
        }
    }

    private long countRooms(String whereClause, Map<String, Object> params) {
        TypedQuery<Long> query = entityManager.createQuery("select count(r) from Room r where " + whereClause, Long.class);
        setParameters(query, params);
        return query.getSingleResult();
    }

    private List<Room> findRoomsWithLandlord(String whereClause, Map<String, Object> params) {
        return findRoomsWithLandlord(whereClause, params, null, null);
    }

    private List<Room> findRoomsWithLandlord(String whereClause, Map<String, Object> params, Integer offset, Integer limit) {
        TypedQuery<Room> query = entityManager.createQuery("""
                select r
                from Room r
                join fetch r.landlord
                where %s
                order by r.createdAt desc
                """.formatted(whereClause), Room.class);
        setParameters(query, params);
        if (offset != null) {
            query.setFirstResult(offset);
        }
        if (limit != null) {
            query.setMaxResults(limit);
        }
        return query.getResultList();
    }

    private void setParameters(Query query, Map<String, Object> params) {
        params.forEach(query::setParameter);
    }

    private Map<Long, List<String>> loadImageUrls(List<Long> roomIds) {
        if (roomIds.isEmpty()) {
            return Map.of();
        }
        return entityManager.createQuery("""
                        select i
                        from RoomImage i
                        where i.room.id in :roomIds
                        order by i.id
                        """, RoomImage.class)
                .setParameter("roomIds", roomIds)
                .getResultList()
                .stream()
                .collect(Collectors.groupingBy(
                        image -> image.room.id,
                        Collectors.mapping(image -> image.imageUrl, Collectors.toList())
                ));
    }

    private Map<Long, List<String>> loadVideoUrls(List<Long> roomIds) {
        if (roomIds.isEmpty()) {
            return Map.of();
        }
        return entityManager.createQuery("""
                        select v
                        from RoomVideo v
                        where v.room.id in :roomIds
                        order by v.id
                        """, RoomVideo.class)
                .setParameter("roomIds", roomIds)
                .getResultList()
                .stream()
                .collect(Collectors.groupingBy(
                        video -> video.room.id,
                        Collectors.mapping(video -> video.videoUrl, Collectors.toList())
                ));
    }

    private Double roundRating(Double averageRating) {
        return averageRating == null ? null : Math.round(averageRating * 10.0) / 10.0;
    }

    private void addSupportedCityConditions(List<String> conditions, Map<String, Object> params) {
        List<String> cityTerms = supportedCityQueryTerms();
        if (cityTerms.isEmpty()) {
            return;
        }

        List<String> cityConditions = new ArrayList<>();
        for (int index = 0; index < cityTerms.size(); index++) {
            String paramName = "supportedCity" + index;
            cityConditions.add("lower(r.address) like :" + paramName);
            params.put(paramName, "%" + cityTerms.get(index) + "%");
        }
        conditions.add("(" + String.join(" or ", cityConditions) + ")");
    }

    private boolean isSupportedAddress(String address) {
        if (!hasText(address)) {
            return false;
        }
        List<String> cities = configuredSupportedCities();
        if (cities.isEmpty()) {
            return true;
        }

        String normalizedAddress = normalizeLocation(address);
        return cities.stream()
                .map(this::normalizeLocation)
                .anyMatch(normalizedAddress::contains);
    }

    private List<String> supportedCityQueryTerms() {
        LinkedHashSet<String> terms = new LinkedHashSet<>();
        for (String city : configuredSupportedCities()) {
            terms.add(city.toLowerCase(Locale.ROOT));
            terms.add(normalizeLocation(city));
        }
        return terms.stream()
                .filter(this::hasText)
                .toList();
    }

    private List<String> configuredSupportedCities() {
        if (supportedCities == null) {
            return List.of();
        }
        return supportedCities.stream()
                .filter(this::hasText)
                .map(String::trim)
                .toList();
    }

    private String supportedCityMessage() {
        List<String> cities = configuredSupportedCities();
        return cities.isEmpty() ? "các khu vực đã cấu hình" : String.join(", ", cities);
    }

    private String normalizeLocation(String value) {
        String lower = value.toLowerCase(Locale.ROOT).replace('đ', 'd');
        String noDiacritics = Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return noDiacritics.replaceAll("[^a-z0-9]+", " ").trim();
    }

    private void replaceMedia(Room room, List<String> imageUrls, List<String> videoUrls) {
        imageRepository.delete("room", room);
        videoRepository.delete("room", room);
        persistMedia(room, imageUrls, videoUrls);
    }

    private void persistMedia(Room room, List<String> imageUrls, List<String> videoUrls) {
        if (imageUrls != null) {
            imageUrls.stream().filter(this::hasText).forEach(url -> {
                RoomImage image = new RoomImage();
                image.room = room;
                image.imageUrl = url.trim();
                imageRepository.persist(image);
            });
        }
        if (videoUrls != null) {
            videoUrls.stream().filter(this::hasText).forEach(url -> {
                RoomVideo video = new RoomVideo();
                video.room = room;
                video.videoUrl = url.trim();
                videoRepository.persist(video);
            });
        }
    }

    private void ensureOwnerOrAdmin(Room room, User user) {
        if (user.role != Role.ADMIN && !room.landlord.id.equals(user.id)) {
            throw new WebApplicationException("Bạn không có quyền quản lý phòng này", Response.Status.FORBIDDEN);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
