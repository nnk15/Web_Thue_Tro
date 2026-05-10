package com.nhatro.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nhatro.entity.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class JwtService {
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();

    @ConfigProperty(name = "app.jwt.issuer")
    String issuer;

    @ConfigProperty(name = "app.jwt.secret")
    String secret;

    @ConfigProperty(name = "app.jwt.expiration-seconds")
    long expirationSeconds;

    @Inject
    ObjectMapper objectMapper;

    public String createToken(User user) {
        try {
            Instant now = Instant.now();
            Map<String, Object> header = new LinkedHashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("iss", issuer);
            claims.put("sub", user.id.toString());
            claims.put("role", user.role.name());
            claims.put("name", user.fullName);
            claims.put("iat", now.getEpochSecond());
            claims.put("exp", now.plusSeconds(expirationSeconds).getEpochSecond());

            String encodedHeader = encodeJson(header);
            String encodedPayload = encodeJson(claims);
            String signedContent = encodedHeader + "." + encodedPayload;
            return signedContent + "." + encode(hmacSha256(signedContent));
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể tạo JWT", exception);
        }
    }

    public Optional<JwtClaims> validate(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }

            String signedContent = parts[0] + "." + parts[1];
            byte[] actualSignature = URL_DECODER.decode(parts[2]);
            byte[] expectedSignature = hmacSha256(signedContent);
            if (!MessageDigest.isEqual(actualSignature, expectedSignature)) {
                return Optional.empty();
            }

            Map<String, Object> claims = objectMapper.readValue(URL_DECODER.decode(parts[1]), new TypeReference<>() {
            });
            if (!issuer.equals(claims.get("iss"))) {
                return Optional.empty();
            }
            long expiresAt = Long.parseLong(claims.get("exp").toString());
            if (Instant.now().getEpochSecond() >= expiresAt) {
                return Optional.empty();
            }

            Long userId = Long.valueOf(claims.get("sub").toString());
            return Optional.of(new JwtClaims(userId, com.nhatro.entity.Role.valueOf(claims.get("role").toString())));
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private String encodeJson(Map<String, Object> value) throws Exception {
        return encode(objectMapper.writeValueAsBytes(value));
    }

    private String encode(byte[] value) {
        return URL_ENCODER.encodeToString(value);
    }

    private byte[] hmacSha256(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }
}
