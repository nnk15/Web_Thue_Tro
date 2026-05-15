package com.nhatro.service;

import com.nhatro.dto.RentalRequestDtos;
import com.nhatro.entity.ApprovalStatus;
import com.nhatro.entity.RentalRequest;
import com.nhatro.entity.RequestStatus;
import com.nhatro.entity.Role;
import com.nhatro.entity.Room;
import com.nhatro.entity.RoomStatus;
import com.nhatro.entity.User;
import com.nhatro.repository.RentalRequestRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.List;

@ApplicationScoped
public class RentalRequestService {
    @Inject
    RentalRequestRepository requestRepository;

    @Inject
    RoomService roomService;

    @Inject
    NotificationService notificationService;

    @Transactional
    public RentalRequestDtos.RentalRequestResponse create(RentalRequestDtos.CreateRentalRequest request, User tenant) {
        Room room = roomService.getRoom(request.roomId());
        if (room.approvalStatus != ApprovalStatus.APPROVED || room.status != RoomStatus.AVAILABLE) {
            throw new WebApplicationException("Phòng không còn khả dụng để gửi yêu cầu thuê", Response.Status.BAD_REQUEST);
        }

        RentalRequest rentalRequest = new RentalRequest();
        rentalRequest.room = room;
        rentalRequest.tenant = tenant;
        rentalRequest.fullName = request.fullName().trim();
        rentalRequest.phone = request.phone().trim();
        rentalRequest.citizenId = request.citizenId().trim();
        rentalRequest.dateOfBirth = request.dateOfBirth();
        rentalRequest.permanentAddress = request.permanentAddress();
        rentalRequest.expectedRentalTime = request.expectedRentalTime().trim();
        rentalRequest.note = request.note();
        rentalRequest.status = RequestStatus.PENDING;
        requestRepository.persist(rentalRequest);

        notificationService.create(room.landlord, "Có yêu cầu thuê phòng mới", tenant.fullName + " muốn thuê phòng: " + room.title);
        notificationService.create(tenant, "Yêu cầu thuê phòng thành công", "Bạn đã gửi yêu cầu thuê phòng: " + room.title + ". Trạng thái hiện tại là chờ xác nhận.");
        return RentalRequestDtos.RentalRequestResponse.from(rentalRequest);
    }

    @Transactional
    public List<RentalRequestDtos.RentalRequestResponse> listMine(User tenant) {
        return requestRepository.find("tenant = ?1 order by createdAt desc", tenant)
                .list()
                .stream()
                .map(RentalRequestDtos.RentalRequestResponse::from)
                .toList();
    }

    @Transactional
    public List<RentalRequestDtos.RentalRequestResponse> listForLandlord(User landlord) {
        if (landlord.role == Role.ADMIN) {
            return requestRepository.findAll()
                    .list()
                    .stream()
                    .map(RentalRequestDtos.RentalRequestResponse::from)
                    .toList();
        }
        return requestRepository.find("room.landlord = ?1 order by createdAt desc", landlord)
                .list()
                .stream()
                .map(RentalRequestDtos.RentalRequestResponse::from)
                .toList();
    }

    @Transactional
    public RentalRequestDtos.RentalRequestResponse cancel(Long id, User tenant) {
        RentalRequest request = getRequest(id);
        if (!request.tenant.id.equals(tenant.id)) {
            throw new WebApplicationException("Bạn không có quyền hủy yêu cầu này", Response.Status.FORBIDDEN);
        }
        ensurePending(request);
        request.status = RequestStatus.CANCELLED;
        notificationService.create(request.room.landlord, "Yêu cầu thuê đã bị hủy", tenant.fullName + " đã hủy yêu cầu thuê phòng: " + request.room.title);
        return RentalRequestDtos.RentalRequestResponse.from(request);
    }

    @Transactional
    public RentalRequestDtos.RentalRequestResponse accept(Long id, User landlord) {
        RentalRequest request = getRequest(id);
        ensureRoomOwnerOrAdmin(request.room, landlord);
        ensurePending(request);
        request.status = RequestStatus.ACCEPTED;
        request.room.status = RoomStatus.RENTED;
        notificationService.create(request.tenant, "Yêu cầu thuê đã được chấp nhận", "Chủ trọ đã chấp nhận yêu cầu thuê phòng: " + request.room.title);
        return RentalRequestDtos.RentalRequestResponse.from(request);
    }

    @Transactional
    public RentalRequestDtos.RentalRequestResponse reject(Long id, User landlord) {
        RentalRequest request = getRequest(id);
        ensureRoomOwnerOrAdmin(request.room, landlord);
        ensurePending(request);
        request.status = RequestStatus.REJECTED;
        notificationService.create(request.tenant, "Yêu cầu thuê đã bị hủy", "Chủ trọ đã hủy yêu cầu thuê phòng: " + request.room.title);
        return RentalRequestDtos.RentalRequestResponse.from(request);
    }

    private RentalRequest getRequest(Long id) {
        return requestRepository.findByIdOptional(id)
                .orElseThrow(() -> new WebApplicationException("Không tìm thấy yêu cầu thuê", Response.Status.NOT_FOUND));
    }

    private void ensurePending(RentalRequest request) {
        if (request.status != RequestStatus.PENDING) {
            throw new WebApplicationException("Chỉ có thể xử lý yêu cầu đang chờ", Response.Status.BAD_REQUEST);
        }
    }

    private void ensureRoomOwnerOrAdmin(Room room, User user) {
        if (user.role != Role.ADMIN && !room.landlord.id.equals(user.id)) {
            throw new WebApplicationException("Bạn không có quyền xử lý yêu cầu này", Response.Status.FORBIDDEN);
        }
    }
}
