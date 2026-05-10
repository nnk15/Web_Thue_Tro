package com.nhatro.resource;

import com.nhatro.dto.ViolationReportDtos;
import com.nhatro.security.AuthContext;
import com.nhatro.service.ViolationReportService;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/violation-reports")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ViolationReportResource {
    @Inject
    AuthContext authContext;

    @Inject
    ViolationReportService violationReportService;

    @POST
    public ViolationReportDtos.ViolationReportResponse create(@Valid ViolationReportDtos.CreateViolationReport request) {
        return violationReportService.create(request, authContext.requireUser());
    }
}
