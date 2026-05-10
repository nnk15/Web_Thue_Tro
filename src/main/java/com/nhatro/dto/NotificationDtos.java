package com.nhatro.dto;

import com.nhatro.entity.Notification;
import java.time.Instant;

public final class NotificationDtos {
    private NotificationDtos() {
    }

    public record NotificationResponse(
            Long id,
            String title,
            String content,
            Boolean read,
            Instant createdAt
    ) {
        public static NotificationResponse from(Notification notification) {
            return new NotificationResponse(
                    notification.id,
                    notification.title,
                    notification.content,
                    notification.read,
                    notification.createdAt
            );
        }
    }
}
