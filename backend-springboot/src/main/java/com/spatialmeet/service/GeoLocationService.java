package com.spatialmeet.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GeoLocationService {

    private static final Logger logger = LoggerFactory.getLogger(GeoLocationService.class);
    private static final String UNKNOWN = "Unknown";
    private static final int CACHE_LIMIT = 500;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
    private final ObjectMapper objectMapper;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public GeoLocationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public CompletableFuture<String> resolve(HttpHeaders headers, InetSocketAddress remoteAddress) {
        String edgeCountry = firstPresent(
                headers.getFirst("CF-IPCountry"),
                headers.getFirst("X-Vercel-IP-Country"));
        if (edgeCountry != null && edgeCountry.length() == 2 && !edgeCountry.equalsIgnoreCase("XX")) {
            return CompletableFuture.completedFuture(
                    edgeCountry.toUpperCase() + " " + flag(edgeCountry));
        }

        String ip = clientIp(headers, remoteAddress);
        if (ip == null || isLocal(ip)) {
            return CompletableFuture.completedFuture(UNKNOWN);
        }

        String cached = cache.get(ip);
        if (cached != null) {
            return CompletableFuture.completedFuture(cached);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://ipwho.is/" + ip + "?fields=success,country,country_code,region,city"))
                .timeout(Duration.ofSeconds(4))
                .GET()
                .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> remember(ip, parse(response.body())))
                .exceptionally(error -> {
                    logger.warn("Geo lookup failed: {}", error.getMessage());
                    return UNKNOWN;
                });
    }

    private String parse(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            if (!node.path("success").asBoolean(false)) {
                return UNKNOWN;
            }

            List<String> parts = new ArrayList<>();
            for (String field : List.of("city", "region", "country")) {
                String value = node.path(field).asText("");
                if (!value.isBlank()) {
                    parts.add(value);
                }
            }
            if (parts.isEmpty()) {
                return UNKNOWN;
            }

            String code = node.path("country_code").asText("");
            return String.join(", ", parts) + (code.length() == 2 ? " " + flag(code) : "");
        } catch (Exception e) {
            return UNKNOWN;
        }
    }

    private String clientIp(HttpHeaders headers, InetSocketAddress remoteAddress) {
        String forwarded = headers.getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String real = headers.getFirst("X-Real-IP");
        if (real != null && !real.isBlank()) {
            return real.trim();
        }
        return remoteAddress != null && remoteAddress.getAddress() != null
                ? remoteAddress.getAddress().getHostAddress()
                : null;
    }

    private boolean isLocal(String ip) {
        try {
            InetAddress address = InetAddress.getByName(ip);
            return address.isLoopbackAddress()
                    || address.isSiteLocalAddress()
                    || address.isAnyLocalAddress()
                    || address.isLinkLocalAddress();
        } catch (Exception e) {
            return true;
        }
    }

    private String remember(String ip, String region) {
        if (cache.size() >= CACHE_LIMIT) {
            cache.clear();
        }
        cache.put(ip, region);
        return region;
    }

    private String flag(String code) {
        String upper = code.toUpperCase();
        return new String(Character.toChars(0x1F1E6 + upper.charAt(0) - 'A'))
                + new String(Character.toChars(0x1F1E6 + upper.charAt(1) - 'A'));
    }

    private String firstPresent(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }
}
