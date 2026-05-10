package com.nhatro.resource;

import com.nhatro.dto.CommonDtos;
import com.nhatro.dto.RoomDtos;
import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import com.nhatro.security.AuthContext;
import com.nhatro.service.FavoriteRoomService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/favorite-rooms")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class FavoriteRoomResource {
    @Inject
    AuthContext authContext;

    @Inject
    FavoriteRoomService favoriteRoomService;

    @POST
    @Path("/{roomId}")
    public RoomDtos.RoomResponse add(@PathParam("roomId") Long roomId) {
        User user = authContext.requireRole(Role.USER);
        return favoriteRoomService.add(roomId, user);
    }

    @GET
    public List<RoomDtos.RoomResponse> list() {
        User user = authContext.requireRole(Role.USER);
        return favoriteRoomService.list(user);
    }

    @DELETE
    @Path("/{roomId}")
    public CommonDtos.MessageResponse remove(@PathParam("roomId") Long roomId) {
        User user = authContext.requireRole(Role.USER);
        favoriteRoomService.remove(roomId, user);
        return new CommonDtos.MessageResponse("Bỏ lưu phòng yêu thích thành công");
    }
}
