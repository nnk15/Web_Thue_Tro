package com.nhatro.service;

import com.nhatro.dto.AuthDtos;
import com.nhatro.dto.UserDtos;
import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import com.nhatro.entity.UserStatus;
import com.nhatro.repository.UserRepository;
import com.nhatro.security.JwtService;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

@ApplicationScoped
public class AuthService {
    @Inject
    UserRepository userRepository;

    @Inject
    JwtService jwtService;

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new WebApplicationException("Mật khẩu xác nhận không khớp", Response.Status.BAD_REQUEST);
        }

        Role role = request.role() == null ? Role.USER : request.role();
        if (role == Role.ADMIN) {
            throw new WebApplicationException("Không thể tự đăng ký tài khoản quản trị viên", Response.Status.BAD_REQUEST);
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new WebApplicationException("Email đã được sử dụng", Response.Status.CONFLICT);
        }
        if (userRepository.existsByPhone(request.phone())) {
            throw new WebApplicationException("Số điện thoại đã được sử dụng", Response.Status.CONFLICT);
        }

        User user = new User();
        user.fullName = request.fullName().trim();
        user.email = request.email().trim().toLowerCase();
        user.phone = request.phone().trim();
        user.password = BcryptUtil.bcryptHash(request.password());
        user.role = role;
        user.status = UserStatus.ACTIVE;
        userRepository.persist(user);

        return new AuthDtos.AuthResponse(jwtService.createToken(user), UserDtos.UserResponse.from(user));
    }

    @Transactional
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user = userRepository.findByEmailOrPhone(request.login())
                .orElseThrow(() -> new WebApplicationException("Thông tin đăng nhập không đúng", Response.Status.UNAUTHORIZED));
        if (user.status != UserStatus.ACTIVE) {
            throw new WebApplicationException("Tài khoản đã bị khóa", Response.Status.FORBIDDEN);
        }
        if (!BcryptUtil.matches(request.password(), user.password)) {
            throw new WebApplicationException("Thông tin đăng nhập không đúng", Response.Status.UNAUTHORIZED);
        }

        return new AuthDtos.AuthResponse(jwtService.createToken(user), UserDtos.UserResponse.from(user));
    }
}
