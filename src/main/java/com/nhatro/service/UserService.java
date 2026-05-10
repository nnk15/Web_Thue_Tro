package com.nhatro.service;

import com.nhatro.dto.UserDtos;
import com.nhatro.entity.User;
import com.nhatro.repository.UserRepository;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

@ApplicationScoped
public class UserService {
    @Inject
    UserRepository userRepository;

    public UserDtos.UserResponse profile(User user) {
        return UserDtos.UserResponse.from(user);
    }

    @Transactional
    public UserDtos.UserResponse updateProfile(User user, UserDtos.UpdateProfileRequest request) {
        if (userRepository.existsByEmailExceptId(request.email(), user.id)) {
            throw new WebApplicationException("Email đã được sử dụng", Response.Status.CONFLICT);
        }
        if (userRepository.existsByPhoneExceptId(request.phone(), user.id)) {
            throw new WebApplicationException("Số điện thoại đã được sử dụng", Response.Status.CONFLICT);
        }
        user.fullName = request.fullName().trim();
        user.email = request.email().trim().toLowerCase();
        user.phone = request.phone().trim();
        user.avatar = request.avatar();
        return UserDtos.UserResponse.from(user);
    }

    @Transactional
    public void changePassword(User user, UserDtos.ChangePasswordRequest request) {
        if (!BcryptUtil.matches(request.oldPassword(), user.password)) {
            throw new WebApplicationException("Mật khẩu hiện tại không đúng", Response.Status.BAD_REQUEST);
        }
        user.password = BcryptUtil.bcryptHash(request.newPassword());
    }
}
