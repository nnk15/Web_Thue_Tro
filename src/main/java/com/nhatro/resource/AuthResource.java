package com.nhatro.resource;

import com.nhatro.dto.AuthDtos;
import com.nhatro.dto.CommonDtos;
import com.nhatro.security.AuthContext;
import com.nhatro.service.AuthService;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {
    @Inject
    AuthService authService;

    @Inject
    AuthContext authContext;

    @POST
    @Path("/register")
    public AuthDtos.AuthResponse register(@Valid AuthDtos.RegisterRequest request) {
        return authService.register(request);
    }

    @POST
    @Path("/login")
    public AuthDtos.AuthResponse login(@Valid AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @POST
    @Path("/logout")
    public CommonDtos.MessageResponse logout() {
        authContext.requireUser();
        return new CommonDtos.MessageResponse("Đăng xuất thành công. Client hãy xóa JWT token đang lưu.");
    }
}
