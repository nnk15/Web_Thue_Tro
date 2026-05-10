package com.nhatro.security;

import com.nhatro.dto.CommonDtos;
import com.nhatro.entity.UserStatus;
import com.nhatro.repository.UserRepository;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class JwtAuthFilter implements ContainerRequestFilter {
    @Inject
    JwtService jwtService;

    @Inject
    UserRepository userRepository;

    @Inject
    AuthContext authContext;

    @Override
    public void filter(ContainerRequestContext requestContext) {
        String authorization = requestContext.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (authorization == null || authorization.isBlank()) {
            return;
        }
        if (!authorization.startsWith("Bearer ")) {
            abort(requestContext, "Authorization header không hợp lệ");
            return;
        }

        String token = authorization.substring("Bearer ".length()).trim();
        jwtService.validate(token)
                .flatMap(claims -> userRepository.findByIdOptional(claims.userId()))
                .filter(user -> user.status == UserStatus.ACTIVE)
                .ifPresentOrElse(authContext::setCurrentUser, () -> abort(requestContext, "Token không hợp lệ hoặc tài khoản đã bị khóa"));
    }

    private void abort(ContainerRequestContext requestContext, String message) {
        requestContext.abortWith(Response.status(Response.Status.UNAUTHORIZED)
                .type(MediaType.APPLICATION_JSON_TYPE)
                .entity(new CommonDtos.ErrorResponse(Response.Status.UNAUTHORIZED.getStatusCode(), message))
                .build());
    }
}
