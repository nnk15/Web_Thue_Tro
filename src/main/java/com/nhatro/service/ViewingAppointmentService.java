package com.nhatro.service;

import com.nhatro.dto.ViewingAppointmentDtos;
import com.nhatro.entity.ApprovalStatus;
import com.nhatro.entity.RequestStatus;
import com.nhatro.entity.Role;
import com.nhatro.entity.Room;
import com.nhatro.entity.RoomStatus;
import com.nhatro.entity.User;
import com.nhatro.entity.ViewingAppointment;
import com.nhatro.repository.ViewingAppointmentRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.List;

@ApplicationScoped
public class ViewingAppointmentService {
    @Inject
    ViewingAppointmentRepository appointmentRepository;

    @Inject
    RoomService roomService;

    @Inject
    NotificationService notificationService;

    @Transactional
    public ViewingAppointmentDtos.ViewingAppointmentResponse create(ViewingAppointmentDtos.CreateViewingAppointment request, User tenant) {
        Room room = roomService.getRoom(request.roomId());
        if (room.approvalStatus != ApprovalStatus.APPROVED || room.status == RoomStatus.HIDDEN) {
            throw new WebApplicationException("Phòng không khả dụng để đặt lịch xem", Response.Status.BAD_REQUEST);
        }

        ViewingAppointment appointment = new ViewingAppointment();
        appointment.room = room;
        appointment.tenant = tenant;
        appointment.fullName = request.fullName().trim();
        appointment.phone = request.phone().trim();
        appointment.appointmentTime = request.appointmentTime();
        appointment.note = request.note();
        appointment.status = RequestStatus.PENDING;
        appointmentRepository.persist(appointment);

        notificationService.create(room.landlord, "Có lịch xem phòng mới", tenant.fullName + " muốn xem phòng: " + room.title);
        return ViewingAppointmentDtos.ViewingAppointmentResponse.from(appointment);
    }

    @Transactional
    public List<ViewingAppointmentDtos.ViewingAppointmentResponse> listMine(User tenant) {
        return appointmentRepository.find("tenant = ?1 order by createdAt desc", tenant)
                .list()
                .stream()
                .map(ViewingAppointmentDtos.ViewingAppointmentResponse::from)
                .toList();
    }

    @Transactional
    public List<ViewingAppointmentDtos.ViewingAppointmentResponse> listForLandlord(User landlord) {
        if (landlord.role == Role.ADMIN) {
            return appointmentRepository.findAll()
                    .list()
                    .stream()
                    .map(ViewingAppointmentDtos.ViewingAppointmentResponse::from)
                    .toList();
        }
        return appointmentRepository.find("room.landlord = ?1 order by createdAt desc", landlord)
                .list()
                .stream()
                .map(ViewingAppointmentDtos.ViewingAppointmentResponse::from)
                .toList();
    }

    @Transactional
    public ViewingAppointmentDtos.ViewingAppointmentResponse cancel(Long id, User tenant) {
        ViewingAppointment appointment = getAppointment(id);
        if (!appointment.tenant.id.equals(tenant.id)) {
            throw new WebApplicationException("Bạn không có quyền hủy lịch này", Response.Status.FORBIDDEN);
        }
        ensurePending(appointment);
        appointment.status = RequestStatus.CANCELLED;
        notificationService.create(appointment.room.landlord, "Lịch xem phòng đã bị hủy", tenant.fullName + " đã hủy lịch xem phòng: " + appointment.room.title);
        return ViewingAppointmentDtos.ViewingAppointmentResponse.from(appointment);
    }

    @Transactional
    public ViewingAppointmentDtos.ViewingAppointmentResponse accept(Long id, User landlord) {
        ViewingAppointment appointment = getAppointment(id);
        ensureRoomOwnerOrAdmin(appointment.room, landlord);
        ensurePending(appointment);
        appointment.status = RequestStatus.ACCEPTED;
        notificationService.create(appointment.tenant, "Lịch xem phòng đã được chấp nhận", "Chủ trọ đã chấp nhận lịch xem phòng: " + appointment.room.title);
        return ViewingAppointmentDtos.ViewingAppointmentResponse.from(appointment);
    }

    @Transactional
    public ViewingAppointmentDtos.ViewingAppointmentResponse reject(Long id, User landlord) {
        ViewingAppointment appointment = getAppointment(id);
        ensureRoomOwnerOrAdmin(appointment.room, landlord);
        ensurePending(appointment);
        appointment.status = RequestStatus.REJECTED;
        notificationService.create(appointment.tenant, "Lịch xem phòng đã bị hủy", "Chủ trọ đã hủy lịch xem phòng: " + appointment.room.title);
        return ViewingAppointmentDtos.ViewingAppointmentResponse.from(appointment);
    }

    private ViewingAppointment getAppointment(Long id) {
        return appointmentRepository.findByIdOptional(id)
                .orElseThrow(() -> new WebApplicationException("Không tìm thấy lịch xem phòng", Response.Status.NOT_FOUND));
    }

    private void ensurePending(ViewingAppointment appointment) {
        if (appointment.status != RequestStatus.PENDING) {
            throw new WebApplicationException("Chỉ có thể xử lý lịch đang chờ", Response.Status.BAD_REQUEST);
        }
    }

    private void ensureRoomOwnerOrAdmin(Room room, User user) {
        if (user.role != Role.ADMIN && !room.landlord.id.equals(user.id)) {
            throw new WebApplicationException("Bạn không có quyền xử lý lịch này", Response.Status.FORBIDDEN);
        }
    }
}
