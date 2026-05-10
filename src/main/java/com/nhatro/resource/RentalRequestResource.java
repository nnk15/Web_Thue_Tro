package com.nhatro.resource;

import com.nhatro.dto.RentalRequestDtos;
import com.nhatro.entity.Role;
import com.nhatro.entity.User;
import com.nhatro.security.AuthContext;
import com.nhatro.service.RentalRequestService;
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

@Path("/api/rental-requests")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class RentalRequestResource {
    @Inject
    AuthContext authContext;

    @Inject
    RentalRequestService rentalRequestService;

    @POST
    public RentalRequestDtos.RentalRequestResponse create(@Valid RentalRequestDtos.CreateRentalRequest request) {
        User tenant = authContext.requireRole(Role.USER);
        return rentalRequestService.create(request, tenant);
    }

    @GET
    @Path("/my")
    public List<RentalRequestDtos.RentalRequestResponse> myRequests() {
        return rentalRequestService.listMine(authContext.requireUser());
    }

    @PUT
    @Path("/{id}/cancel")
    public RentalRequestDtos.RentalRequestResponse cancel(@PathParam("id") Long id) {
        return rentalRequestService.cancel(id, authContext.requireUser());
    }

    @PUT
    @Path("/{id}/accept")
    public RentalRequestDtos.RentalRequestResponse accept(@PathParam("id") Long id) {
        User landlord = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return rentalRequestService.accept(id, landlord);
    }

    @PUT
    @Path("/{id}/reject")
    public RentalRequestDtos.RentalRequestResponse reject(@PathParam("id") Long id) {
        User landlord = authContext.requireRole(Role.LANDLORD, Role.ADMIN);
        return rentalRequestService.reject(id, landlord);
    }
}
