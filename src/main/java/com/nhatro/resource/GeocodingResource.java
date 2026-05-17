package com.nhatro.resource;

import com.nhatro.dto.GeocodingDtos;
import com.nhatro.service.GeocodingService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/geocoding")
@Produces(MediaType.APPLICATION_JSON)
public class GeocodingResource {
    @Inject
    GeocodingService geocodingService;

    @GET
    public GeocodingDtos.GeocodeResponse geocode(@QueryParam("address") String address) {
        if (address == null || address.isBlank()) {
            throw new WebApplicationException("Vui lòng nhập địa chỉ cần tìm tọa độ", Response.Status.BAD_REQUEST);
        }

        return geocodingService.geocode(address)
                .map(result -> new GeocodingDtos.GeocodeResponse(
                        result.address(),
                        result.formattedAddress(),
                        result.latitude(),
                        result.longitude(),
                        result.provider(),
                        true,
                        "Đã tìm thấy tọa độ từ OpenStreetMap"
                ))
                .orElseGet(() -> new GeocodingDtos.GeocodeResponse(
                        address.trim(),
                        null,
                        null,
                        null,
                        "openstreetmap",
                        false,
                        "OpenStreetMap chưa tìm thấy tọa độ phù hợp cho địa chỉ này"
                ));
    }
}
