package com.nhatro.resource;

import com.nhatro.dto.RentalRequestDtos;
import com.nhatro.entity.Role;
import com.nhatro.security.AuthContext;
import com.nhatro.service.RentalRequestService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/landlord/rental-requests")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class LandlordRentalRequestResource {
    @Inject
    AuthContext authContext;

    @Inject
    RentalRequestService rentalRequestService;

    @GET
    public List<RentalRequestDtos.RentalRequestResponse> list() {
        return rentalRequestService.listForLandlord(authContext.requireRole(Role.LANDLORD, Role.ADMIN));
    }
}
