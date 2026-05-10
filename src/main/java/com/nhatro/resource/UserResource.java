package com.nhatro.resource;

import com.nhatro.dto.CommonDtos;
import com.nhatro.dto.UserDtos;
import com.nhatro.entity.User;
import com.nhatro.security.AuthContext;
import com.nhatro.service.UserService;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/users")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class UserResource {
    @Inject
    AuthContext authContext;

    @Inject
    UserService userService;

    @GET
    @Path("/profile")
    public UserDtos.UserResponse profile() {
        return userService.profile(authContext.requireUser());
    }

    @PUT
    @Path("/profile")
    public UserDtos.UserResponse updateProfile(@Valid UserDtos.UpdateProfileRequest request) {
        User user = authContext.requireUser();
        return userService.updateProfile(user, request);
    }

    @PUT
    @Path("/change-password")
    public CommonDtos.MessageResponse changePassword(@Valid UserDtos.ChangePasswordRequest request) {
        userService.changePassword(authContext.requireUser(), request);
        return new CommonDtos.MessageResponse("Đổi mật khẩu thành công");
    }
}
