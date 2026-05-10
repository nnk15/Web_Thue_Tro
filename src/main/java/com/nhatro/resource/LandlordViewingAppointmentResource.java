package com.nhatro.resource;

import com.nhatro.dto.ViewingAppointmentDtos;
import com.nhatro.entity.Role;
import com.nhatro.security.AuthContext;
import com.nhatro.service.ViewingAppointmentService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/landlord/viewing-appointments")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class LandlordViewingAppointmentResource {
    @Inject
    AuthContext authContext;

    @Inject
    ViewingAppointmentService appointmentService;

    @GET
    public List<ViewingAppointmentDtos.ViewingAppointmentResponse> list() {
        return appointmentService.listForLandlord(authContext.requireRole(Role.LANDLORD, Role.ADMIN));
    }
}
