package com.nhatro.resource;

import com.nhatro.dto.CommonDtos;
import com.nhatro.dto.RoomDtos;
import com.nhatro.entity.Role;
import com.nhatro.entity.RoomStatus;
import com.nhatro.entity.User;
import com.nhatro.security.AuthContext;
import com.nhatro.service.RoomService;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.math.BigDecimal;
import java.util.List;

@Path("/api/rooms")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class RoomResource {
    @Inject
    RoomService roomService;

    @Inject
    AuthContext authContext;

    @GET
    public RoomDtos.RoomSearchResponse search(
            @QueryParam("keyword") String keyword,
            @QueryParam("location") String location,
            @QueryParam("minPrice") BigDecimal minPrice,
            @QueryParam("maxPrice") BigDecimal maxPrice,
            @QueryParam("minArea") Double minArea,
            @QueryParam("maxArea") Double maxArea,
            @QueryParam("status") RoomStatus status,
            @QueryParam("furnitureType") String furnitureType,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("12") int size
    ) {
        return roomService.search(keyword, location, minPrice, maxPrice, minArea, maxArea, status, furnitureType, page, size);
    }

    @GET
    @Path("/my")
    public List<RoomDtos.RoomResponse> myRooms() {
        User user = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return roomService.listMine(user);
    }

    @GET
    @Path("/{id}")
    public RoomDtos.RoomResponse detail(@PathParam("id") Long id) {
        return roomService.get(id);
    }

    @POST
    public RoomDtos.RoomResponse create(@Valid RoomDtos.RoomRequest request) {
        User landlord = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return roomService.create(request, landlord);
    }

    @PUT
    @Path("/{id}")
    public RoomDtos.RoomResponse update(@PathParam("id") Long id, @Valid RoomDtos.RoomRequest request) {
        User user = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return roomService.update(id, request, user);
    }

    @DELETE
    @Path("/{id}")
    public CommonDtos.MessageResponse delete(@PathParam("id") Long id) {
        User user = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        roomService.delete(id, user);
        return new CommonDtos.MessageResponse("Xóa phòng trọ thành công");
    }

    @PUT
    @Path("/{id}/hide")
    public RoomDtos.RoomResponse hide(@PathParam("id") Long id) {
        User user = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return roomService.hide(id, user);
    }

    @PUT
    @Path("/{id}/show")
    public RoomDtos.RoomResponse show(@PathParam("id") Long id) {
        User user = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return roomService.show(id, user);
    }
}
