package com.nhatro.dto;

import java.util.List;

public final class UploadDtos {
    private UploadDtos() {
    }

    public record UploadResponse(List<String> urls) {
    }
}
