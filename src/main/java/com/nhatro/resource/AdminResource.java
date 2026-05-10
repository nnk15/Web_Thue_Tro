package com.nhatro.resource;

import com.nhatro.dto.AdminDtos;
import com.nhatro.dto.CommonDtos;
import com.nhatro.dto.RoomDtos;
import com.nhatro.dto.UserDtos;
import com.nhatro.dto.ViolationReportDtos;
import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import com.nhatro.security.AuthContext;
import com.nhatro.service.AdminService;
import com.nhatro.service.RoomService;
import com.nhatro.service.ViolationReportService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/admin")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AdminResource {
    @Inject
    AuthContext authContext;

    @Inject
    AdminService adminService;

    @Inject
    RoomService roomService;

    @Inject
    ViolationReportService violationReportService;

    @GET
    @Path("/users")
    public List<UserDtos.UserResponse> users(@QueryParam("keyword") String keyword) {
        authContext.requireRole(Role.ADMIN);
        return adminService.listUsers(keyword);
    }

    @PUT
    @Path("/users/{id}/lock")
    public UserDtos.UserResponse lockUser(@PathParam("id") Long id) {
        User admin = authContext.requireRole(Role.ADMIN);
        return adminService.lockUser(id, admin);
    }

    @PUT
    @Path("/users/{id}/unlock")
    public UserDtos.UserResponse unlockUser(@PathParam("id") Long id) {
        authContext.requireRole(Role.ADMIN);
        return adminService.unlockUser(id);
    }

    @DELETE
    @Path("/users/{id}")
    public CommonDtos.MessageResponse deleteUser(@PathParam("id") Long id) {
        User admin = authContext.requireRole(Role.ADMIN);
        adminService.deleteUser(id, admin);
        return new CommonDtos.MessageResponse("Xóa người dùng thành công");
    }

    @GET
    @Path("/rooms/pending")
    public List<RoomDtos.RoomResponse> pendingRooms() {
        authContext.requireRole(Role.ADMIN);
        return roomService.pendingRooms();
    }

    @PUT
    @Path("/rooms/{id}/approve")
    public RoomDtos.RoomResponse approveRoom(@PathParam("id") Long id) {
        authContext.requireRole(Role.ADMIN);
        return roomService.approve(id);
    }

    @PUT
    @Path("/rooms/{id}/reject")
    public RoomDtos.RoomResponse rejectRoom(@PathParam("id") Long id) {
        authContext.requireRole(Role.ADMIN);
        return roomService.reject(id);
    }

    @GET
    @Path("/statistics")
    public AdminDtos.StatisticsResponse statistics() {
        authContext.requireRole(Role.ADMIN);
        return adminService.statistics();
    }

    @GET
    @Path("/violation-reports")
    public List<ViolationReportDtos.ViolationReportResponse> violationReports() {
        authContext.requireRole(Role.ADMIN);
        return violationReportService.listAll();
    }

    @PUT
    @Path("/violation-reports/{id}/resolve")
    public ViolationReportDtos.ViolationReportResponse resolveViolationReport(@PathParam("id") Long id) {
        authContext.requireRole(Role.ADMIN);
        return violationReportService.resolve(id);
    }
}
