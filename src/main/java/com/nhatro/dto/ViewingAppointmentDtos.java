package com.nhatro.dto;

import com.nhatro.entity.RequestStatus;
import com.nhatro.entity.ViewingAppointment;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDateTime;

public final class ViewingAppointmentDtos {
    private ViewingAppointmentDtos() {
    }

    public record CreateViewingAppointment(
            @NotNull Long roomId,
            @NotBlank String fullName,
            @NotBlank String phone,
            @NotNull @Future LocalDateTime appointmentTime,
            String note
    ) {
    }

    public record ViewingAppointmentResponse(
            Long id,
            Long roomId,
            String roomTitle,
            Long tenantId,
            String tenantName,
            String fullName,
            String phone,
            LocalDateTime appointmentTime,
            String note,
            RequestStatus status,
            Instant createdAt
    ) {
        public static ViewingAppointmentResponse from(ViewingAppointment appointment) {
            return new ViewingAppointmentResponse(
                    appointment.id,
                    appointment.room.id,
                    appointment.room.title,
                    appointment.tenant.id,
                    appointment.tenant.fullName,
                    appointment.fullName,
                    appointment.phone,
                    appointment.appointmentTime,
                    appointment.note,
                    appointment.status,
                    appointment.createdAt
            );
        }
    }
}
