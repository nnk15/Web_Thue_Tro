package com.nhatro.dto;

import com.nhatro.entity.ApprovalStatus;
import com.nhatro.entity.Room;
import com.nhatro.entity.RoomStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class RoomDtos {
    private RoomDtos() {
    }

    public record RoomRequest(
            @NotBlank String title,
            @NotNull @DecimalMin("0") BigDecimal price,
            @NotNull @DecimalMin("0") BigDecimal deposit,
            @NotNull @DecimalMin("1") Double area,
            @NotBlank String address,
            String description,
            String amenities,
            String rules,
            String furnitureType,
            RoomStatus status,
            Double latitude,
            Double longitude,
            List<String> imageUrls,
            List<String> videoUrls
    ) {
    }

    public record RoomResponse(
            Long id,
            Long landlordId,
            String landlordName,
            String landlordPhone,
            String landlordCitizenId,
            String title,
            BigDecimal price,
            BigDecimal deposit,
            Double area,
            String address,
            String description,
            String amenities,
            String rules,
            String furnitureType,
            RoomStatus status,
            ApprovalStatus approvalStatus,
            Double latitude,
            Double longitude,
            List<String> imageUrls,
            List<String> videoUrls,
            Double averageRating,
            Long reviewCount,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static RoomResponse from(Room room, List<String> imageUrls, List<String> videoUrls, Double averageRating, Long reviewCount) {
            return new RoomResponse(
                    room.id,
                    room.landlord.id,
                    room.landlord.fullName,
                    room.landlord.phone,
                    room.landlord.citizenId,
                    room.title,
                    room.price,
                    room.deposit,
                    room.area,
                    room.address,
                    room.description,
                    room.amenities,
                    room.rules,
                    room.furnitureType,
                    room.status,
                    room.approvalStatus,
                    room.latitude,
                    room.longitude,
                    imageUrls,
                    videoUrls,
                    averageRating,
                    reviewCount,
                    room.createdAt,
                    room.updatedAt
            );
        }
    }

    public record RoomSearchResponse(
            List<RoomResponse> rooms,
            long total,
            int page,
            int size
    ) {
    }
}
