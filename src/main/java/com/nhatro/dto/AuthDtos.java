package com.nhatro.dto;

import com.nhatro.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank String fullName,
            @NotBlank @Email String email,
            @NotBlank String phone,
            @NotBlank @Size(min = 6) String password,
            @NotBlank @Size(min = 6) String confirmPassword,
            Role role
    ) {
    }

    public record LoginRequest(
            @NotBlank String login,
            @NotBlank String password
    ) {
    }

    public record AuthResponse(
            String token,
            UserDtos.UserResponse user
    ) {
    }
}
