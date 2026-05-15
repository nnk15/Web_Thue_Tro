package com.nhatro.dto;

import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import com.nhatro.entity.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class UserDtos {
    private UserDtos() {
    }

    public record UserResponse(
            Long id,
            String fullName,
            String email,
            String phone,
            String citizenId,
            String avatar,
            Role role,
            UserStatus status,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static UserResponse from(User user) {
            return new UserResponse(
                    user.id,
                    user.fullName,
                    user.email,
                    user.phone,
                    user.citizenId,
                    user.avatar,
                    user.role,
                    user.status,
                    user.createdAt,
                    user.updatedAt
            );
        }
    }

    public record UpdateProfileRequest(
            @NotBlank String fullName,
            @NotBlank @Email String email,
            @NotBlank String phone,
            String citizenId,
            String avatar
    ) {
    }

    public record ChangePasswordRequest(
            @NotBlank String oldPassword,
            @NotBlank @Size(min = 6) String newPassword
    ) {
    }
}
