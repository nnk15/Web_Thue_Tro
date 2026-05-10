package com.nhatro.dto;

import com.nhatro.entity.RentalRequest;
import com.nhatro.entity.RequestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;

public final class RentalRequestDtos {
    private RentalRequestDtos() {
    }

    public record CreateRentalRequest(
            @NotNull Long roomId,
            @NotBlank String fullName,
            @NotBlank String phone,
            @NotBlank String citizenId,
            LocalDate dateOfBirth,
            String permanentAddress,
            @NotBlank String expectedRentalTime,
            String note
    ) {
    }

    public record RentalRequestResponse(
            Long id,
            Long roomId,
            String roomTitle,
            Long tenantId,
            String tenantName,
            String fullName,
            String phone,
            String citizenId,
            LocalDate dateOfBirth,
            String permanentAddress,
            String expectedRentalTime,
            String note,
            RequestStatus status,
            Instant createdAt
    ) {
        public static RentalRequestResponse from(RentalRequest request) {
            return new RentalRequestResponse(
                    request.id,
                    request.room.id,
                    request.room.title,
                    request.tenant.id,
                    request.tenant.fullName,
                    request.fullName,
                    request.phone,
                    request.citizenId,
                    request.dateOfBirth,
                    request.permanentAddress,
                    request.expectedRentalTime,
                    request.note,
                    request.status,
                    request.createdAt
            );
        }
    }
}
