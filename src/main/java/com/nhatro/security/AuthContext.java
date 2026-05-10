package com.nhatro.security;

import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import jakarta.enterprise.context.RequestScoped;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.Arrays;
import java.util.Optional;

@RequestScoped
public class AuthContext {
    private User currentUser;

    public void setCurrentUser(User currentUser) {
        this.currentUser = currentUser;
    }

    public Optional<User> currentUser() {
        return Optional.ofNullable(currentUser);
    }

    public User requireUser() {
        if (currentUser == null) {
            throw new WebApplicationException("Vui lòng đăng nhập", Response.Status.UNAUTHORIZED);
        }
        return currentUser;
    }

    public User requireRole(Role... roles) {
        User user = requireUser();
        boolean allowed = Arrays.stream(roles).anyMatch(role -> role == user.role);
        if (!allowed) {
            throw new WebApplicationException("Bạn không có quyền thực hiện thao tác này", Response.Status.FORBIDDEN);
        }
        return user;
    }
}
