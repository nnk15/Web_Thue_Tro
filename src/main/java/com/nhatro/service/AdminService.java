package com.nhatro.service;

import com.nhatro.dto.AdminDtos;
import com.nhatro.dto.UserDtos;
import com.nhatro.entity.ApprovalStatus;
import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import com.nhatro.entity.UserStatus;
import com.nhatro.repository.FavoriteRoomRepository;
import com.nhatro.repository.RentalRequestRepository;
import com.nhatro.repository.RoomRepository;
import com.nhatro.repository.UserRepository;
import com.nhatro.repository.ViewingAppointmentRepository;
import com.nhatro.repository.ViolationReportRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class AdminService {
    @Inject
    UserRepository userRepository;

    @Inject
    RoomRepository roomRepository;

    @Inject
    RentalRequestRepository rentalRequestRepository;

    @Inject
    ViewingAppointmentRepository appointmentRepository;

    @Inject
    FavoriteRoomRepository favoriteRoomRepository;

    @Inject
    ViolationReportRepository reportRepository;

    @Transactional
    public List<UserDtos.UserResponse> listUsers(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return userRepository.findAll(Sort.by("createdAt").descending())
                    .list()
                    .stream()
                    .map(UserDtos.UserResponse::from)
                    .toList();
        }

        Map<String, Object> params = new HashMap<>();
        params.put("keyword", "%" + keyword.trim().toLowerCase() + "%");
        return userRepository.find("lower(fullName) like :keyword or lower(email) like :keyword or phone like :keyword or citizenId like :keyword", Sort.by("createdAt").descending(), params)
                .list()
                .stream()
                .map(UserDtos.UserResponse::from)
                .toList();
    }

    @Transactional
    public UserDtos.UserResponse lockUser(Long id, User currentAdmin) {
        User user = getUser(id);
        if (user.id.equals(currentAdmin.id)) {
            throw new WebApplicationException("Không thể khóa chính tài khoản đang đăng nhập", Response.Status.BAD_REQUEST);
        }
        user.status = UserStatus.LOCKED;
        return UserDtos.UserResponse.from(user);
    }

    @Transactional
    public UserDtos.UserResponse unlockUser(Long id) {
        User user = getUser(id);
        user.status = UserStatus.ACTIVE;
        return UserDtos.UserResponse.from(user);
    }

    @Transactional
    public void deleteUser(Long id, User currentAdmin) {
        User user = getUser(id);
        if (user.id.equals(currentAdmin.id)) {
            throw new WebApplicationException("Không thể xóa chính tài khoản đang đăng nhập", Response.Status.BAD_REQUEST);
        }
        userRepository.delete(user);
    }

    @Transactional
    public AdminDtos.StatisticsResponse statistics() {
        return new AdminDtos.StatisticsResponse(
                userRepository.count(),
                userRepository.countByRole(Role.USER),
                userRepository.countByRole(Role.LANDLORD),
                userRepository.countByRole(Role.ADMIN),
                roomRepository.count(),
                roomRepository.count("approvalStatus", ApprovalStatus.PENDING),
                rentalRequestRepository.count(),
                appointmentRepository.count(),
                favoriteRoomRepository.count(),
                reportRepository.count()
        );
    }

    private User getUser(Long id) {
        return userRepository.findByIdOptional(id)
                .orElseThrow(() -> new WebApplicationException("Không tìm thấy người dùng", Response.Status.NOT_FOUND));
    }
}
