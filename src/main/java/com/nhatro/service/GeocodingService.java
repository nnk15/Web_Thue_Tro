package com.nhatro.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.jboss.logging.Logger;

@ApplicationScoped
public class GeocodingService {
    private static final Logger LOG = Logger.getLogger(GeocodingService.class);
    private static final String PROVIDER = "openstreetmap";
    private static final String NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search.php";
    private static final String USER_AGENT = "NhaTroMVP/1.0 (linhkhanh15102005@gmail.com)";
    private static final long MIN_REQUEST_INTERVAL_MS = 1100L;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();
    private final Map<String, GeocodeResult> cache = new ConcurrentHashMap<>();
    private final Object rateLimitLock = new Object();
    private volatile long lastRequestAt;

    @Inject
    ObjectMapper objectMapper;

    public boolean isConfigured() {
        return true;
    }

    public Optional<GeocodeResult> geocode(String address) {
        if (!hasText(address)) {
            return Optional.empty();
        }

        String originalAddress = address.trim();
        String cacheKey = normalizeCacheKey(originalAddress);
        GeocodeResult cached = cache.get(cacheKey);
        if (cached != null) {
            return Optional.of(cached);
        }

        String encodedAddress = URLEncoder.encode(withVietnam(originalAddress), StandardCharsets.UTF_8);
        URI uri = URI.create(NOMINATIM_SEARCH_URL
                + "?format=jsonv2"
                + "&q=" + encodedAddress
                + "&limit=1"
                + "&addressdetails=1"
                + "&countrycodes=vn"
                + "&accept-language=vi");

        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(12))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json")
                .header("Accept-Language", "vi")
                .GET()
                .build();

        try {
            throttleNominatim();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOG.warnf("Nominatim geocoding failed with HTTP %s for address: %s", response.statusCode(), originalAddress);
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response.body());
            if (!root.isArray() || root.isEmpty()) {
                LOG.debugf("Nominatim did not find coordinates for address: %s", originalAddress);
                return Optional.empty();
            }

            JsonNode first = root.get(0);
            double latitude = parseCoordinate(first.path("lat").asText());
            double longitude = parseCoordinate(first.path("lon").asText());
            if (!Double.isFinite(latitude) || !Double.isFinite(longitude)) {
                return Optional.empty();
            }

            GeocodeResult result = new GeocodeResult(
                    originalAddress,
                    first.path("display_name").asText(originalAddress),
                    round(latitude),
                    round(longitude),
                    PROVIDER
            );
            cache.put(cacheKey, result);
            return Optional.of(result);
        } catch (IOException exception) {
            LOG.warnf(exception, "Could not parse Nominatim geocoding response for address: %s", originalAddress);
            return Optional.empty();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            LOG.warnf(exception, "Nominatim geocoding was interrupted for address: %s", originalAddress);
            return Optional.empty();
        } catch (RuntimeException exception) {
            LOG.warnf(exception, "Nominatim geocoding failed for address: %s", originalAddress);
            return Optional.empty();
        }
    }

    private String withVietnam(String address) {
        String normalized = normalizeCacheKey(address);
        return normalized.contains("viet nam") || normalized.contains("vietnam")
                ? address
                : address + ", Viet Nam";
    }

    private void throttleNominatim() throws InterruptedException {
        synchronized (rateLimitLock) {
            long elapsed = System.currentTimeMillis() - lastRequestAt;
            long waitTime = MIN_REQUEST_INTERVAL_MS - elapsed;
            if (waitTime > 0) {
                Thread.sleep(waitTime);
            }
            lastRequestAt = System.currentTimeMillis();
        }
    }

    private double parseCoordinate(String value) {
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException exception) {
            return Double.NaN;
        }
    }

    private double round(double value) {
        return Math.round(value * 1_000_000d) / 1_000_000d;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeCacheKey(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    public record GeocodeResult(
            String address,
            String formattedAddress,
            Double latitude,
            Double longitude,
            String provider
    ) {
    }
}
