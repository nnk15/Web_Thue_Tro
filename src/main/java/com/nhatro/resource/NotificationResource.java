package com.nhatro.resource;

import com.nhatro.dto.NotificationDtos;
import com.nhatro.entity.User;
import com.nhatro.security.AuthContext;
import com.nhatro.service.NotificationService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/api/notifications")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class NotificationResource {
    @Inject
    AuthContext authContext;

    @Inject
    NotificationService notificationService;

    @GET
    public List<NotificationDtos.NotificationResponse> list() {
        return notificationService.list(authContext.requireUser());
    }

    @PUT
    @Path("/{id}/read")
    public NotificationDtos.NotificationResponse markRead(@PathParam("id") Long id) {
        User user = authContext.requireUser();
        return notificationService.markRead(id, user);
    }
}
