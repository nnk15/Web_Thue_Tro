package com.nhatro.config;

import com.nhatro.dto.CommonDtos;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import java.util.stream.Collectors;

@Provider
public class ApiExceptionMapper implements ExceptionMapper<Throwable> {
    @Override
    public Response toResponse(Throwable exception) {
        if (exception instanceof ConstraintViolationException validationException) {
            String message = validationException.getConstraintViolations().stream()
                    .map(violation -> violation.getPropertyPath() + " " + violation.getMessage())
                    .collect(Collectors.joining("; "));
            return build(Response.Status.BAD_REQUEST.getStatusCode(), message);
        }

        if (exception instanceof WebApplicationException webException) {
            int status = webException.getResponse().getStatus();
            String message = webException.getMessage() == null || webException.getMessage().isBlank()
                    ? "Yêu cầu không hợp lệ"
                    : webException.getMessage();
            return build(status, message);
        }

        return build(Response.Status.INTERNAL_SERVER_ERROR.getStatusCode(), "Có lỗi hệ thống, vui lòng thử lại sau");
    }

    private Response build(int status, String message) {
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON_TYPE)
                .entity(new CommonDtos.ErrorResponse(status, message))
                .build();
    }
}
