package com.nhatro.dto;

public final class GeocodingDtos {
    private GeocodingDtos() {
    }

    public record GeocodeResponse(
            String address,
            String formattedAddress,
            Double latitude,
            Double longitude,
            String provider,
            boolean found,
            String message
    ) {
    }
}
