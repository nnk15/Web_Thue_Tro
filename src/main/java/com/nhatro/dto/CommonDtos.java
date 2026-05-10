package com.nhatro.dto;

public final class CommonDtos {
    private CommonDtos() {
    }

    public record MessageResponse(String message) {
    }

    public record ErrorResponse(int status, String message) {
    }
}
