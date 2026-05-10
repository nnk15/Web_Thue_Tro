package com.nhatro.service;

import com.nhatro.dto.NotificationDtos;
import com.nhatro.entity.Notification;
import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import com.nhatro.repository.NotificationRepository;
import com.nhatro.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.List;

@ApplicationScoped
public class NotificationService {
    @Inject
    NotificationRepository notificationRepository;

    @Inject
    UserRepository userRepository;

    @Transactional
    public void create(User user, String title, String content) {
        if (user == null) {
            return;
        }
        Notification notification = new Notification();
        notification.user = user;
        notification.title = title;
        notification.content = content;
        notification.read = false;
        notificationRepository.persist(notification);
    }

    @Transactional
    public void createForAdmins(String title, String content) {
        userRepository.list("role", Role.ADMIN).forEach(admin -> create(admin, title, content));
    }

    @Transactional
    public List<NotificationDtos.NotificationResponse> list(User user) {
        return notificationRepository.find("user = ?1 order by createdAt desc", user)
                .list()
                .stream()
                .map(NotificationDtos.NotificationResponse::from)
                .toList();
    }

    @Transactional
    public NotificationDtos.NotificationResponse markRead(Long id, User user) {
        Notification notification = notificationRepository.findByIdOptional(id)
                .orElseThrow(() -> new WebApplicationException("Không tìm thấy thông báo", Response.Status.NOT_FOUND));
        if (!notification.user.id.equals(user.id)) {
            throw new WebApplicationException("Bạn không có quyền cập nhật thông báo này", Response.Status.FORBIDDEN);
        }
        notification.read = true;
        return NotificationDtos.NotificationResponse.from(notification);
    }
}
