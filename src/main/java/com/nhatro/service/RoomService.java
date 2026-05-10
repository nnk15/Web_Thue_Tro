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
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    AuthContext authContext;

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
        conditions.add("approvalStatus = :approved");
        conditions.add("status <> :hidden");
        conditions.add("(lower(address) like :hanoiAccent or lower(address) like :hanoiPlain)");
        params.put("approved", ApprovalStatus.APPROVED);
        params.put("hidden", RoomStatus.HIDDEN);
        params.put("hanoiAccent", "%hà nội%");
        params.put("hanoiPlain", "%ha noi%");

        if (hasText(keyword)) {
            conditions.add("(lower(title) like :keyword or lower(address) like :keyword)");
            params.put("keyword", "%" + keyword.trim().toLowerCase() + "%");
        }
        if (hasText(location)) {
            conditions.add("lower(address) like :location");
            params.put("location", "%" + location.trim().toLowerCase() + "%");
        }
        if (minPrice != null) {
            conditions.add("price >= :minPrice");
            params.put("minPrice", minPrice);
        }
        if (maxPrice != null) {
            conditions.add("price <= :maxPrice");
            params.put("maxPrice", maxPrice);
        }
        if (minArea != null) {
            conditions.add("area >= :minArea");
            params.put("minArea", minArea);
        }
        if (maxArea != null) {
            conditions.add("area <= :maxArea");
            params.put("maxArea", maxArea);
        }
        if (status != null) {
            conditions.add("status = :status");
            params.put("status", status);
        }
        if (hasText(furnitureType)) {
            conditions.add("lower(furnitureType) like :furnitureType");
            params.put("furnitureType", "%" + furnitureType.trim().toLowerCase() + "%");
        }

        PanacheQuery<Room> query = roomRepository.find(String.join(" and ", conditions), Sort.by("createdAt").descending(), params);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        long total = query.count();
        List<RoomDtos.RoomResponse> rooms = query.page(Page.of(safePage, safeSize))
                .list()
                .stream()
                .map(this::toResponse)
                .toList();
        return new RoomDtos.RoomSearchResponse(rooms, total, safePage, safeSize);
    }

    @Transactional
    public List<RoomDtos.RoomResponse> listMine(User user) {
        if (user.role == Role.ADMIN) {
            return roomRepository.findAll(Sort.by("createdAt").descending())
                    .list()
                    .stream()
                    .map(this::toResponse)
                    .toList();
        }
        return roomRepository.find("landlord = ?1", Sort.by("createdAt").descending(), user)
                .list()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RoomDtos.RoomResponse get(Long id) {
        Room room = getRoom(id);
        boolean publicVisible = room.approvalStatus == ApprovalStatus.APPROVED
                && room.status != RoomStatus.HIDDEN
                && isHanoiAddress(room.address);
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
        return roomRepository.find("approvalStatus = ?1", Sort.by("createdAt").descending(), ApprovalStatus.PENDING)
                .list()
                .stream()
                .map(this::toResponse)
                .toList();
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
        List<String> imageUrls = imageRepository.find("room = ?1", room)
                .list()
                .stream()
                .map(image -> image.imageUrl)
                .toList();
        List<String> videoUrls = videoRepository.find("room = ?1", room)
                .list()
                .stream()
                .map(video -> video.videoUrl)
                .toList();
        long reviewCount = reviewRepository.countByRoom(room);
        Double averageRating = reviewCount == 0 ? null : reviewRepository.averageRating(room);
        if (averageRating != null) {
            averageRating = Math.round(averageRating * 10.0) / 10.0;
        }
        return RoomDtos.RoomResponse.from(room, imageUrls, videoUrls, averageRating, reviewCount);
    }

    private void applyFields(Room room, RoomDtos.RoomRequest request) {
        if (!isHanoiAddress(request.address())) {
            throw new WebApplicationException("Hiện hệ thống chỉ hỗ trợ phòng trọ tại Hà Nội. Vui lòng nhập địa chỉ có Hà Nội.", Response.Status.BAD_REQUEST);
        }
        room.title = request.title().trim();
        room.price = request.price();
        room.deposit = request.deposit();
        room.area = request.area();
        room.address = request.address().trim();
        room.description = request.description();
        room.amenities = request.amenities();
        room.rules = request.rules();
        room.furnitureType = request.furnitureType();
        room.latitude = request.latitude();
        room.longitude = request.longitude();
    }

    private boolean isHanoiAddress(String address) {
        if (!hasText(address)) {
            return false;
        }
        String normalized = address.toLowerCase();
        return normalized.contains("hà nội") || normalized.contains("ha noi");
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
