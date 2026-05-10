package com.nhatro.resource;

import com.nhatro.dto.ViewingAppointmentDtos;
import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import com.nhatro.security.AuthContext;
import com.nhatro.service.ViewingAppointmentService;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/viewing-appointments")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ViewingAppointmentResource {
    @Inject
    AuthContext authContext;

    @Inject
    ViewingAppointmentService appointmentService;

    @POST
    public ViewingAppointmentDtos.ViewingAppointmentResponse create(@Valid ViewingAppointmentDtos.CreateViewingAppointment request) {
        User tenant = authContext.requireRole(Role.USER);
        return appointmentService.create(request, tenant);
    }

    @GET
    @Path("/my")
    public List<ViewingAppointmentDtos.ViewingAppointmentResponse> myAppointments() {
        return appointmentService.listMine(authContext.requireUser());
    }

    @PUT
    @Path("/{id}/cancel")
    public ViewingAppointmentDtos.ViewingAppointmentResponse cancel(@PathParam("id") Long id) {
        return appointmentService.cancel(id, authContext.requireUser());
    }

    @PUT
    @Path("/{id}/accept")
    public ViewingAppointmentDtos.ViewingAppointmentResponse accept(@PathParam("id") Long id) {
        User landlord = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return appointmentService.accept(id, landlord);
    }

    @PUT
    @Path("/{id}/reject")
    public ViewingAppointmentDtos.ViewingAppointmentResponse reject(@PathParam("id") Long id) {
        User landlord = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return appointmentService.reject(id, landlord);
    }
}
