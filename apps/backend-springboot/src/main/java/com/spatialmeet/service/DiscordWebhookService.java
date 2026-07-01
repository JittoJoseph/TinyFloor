package com.spatialmeet.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DiscordWebhookService {

    private static final Logger logger = LoggerFactory.getLogger(DiscordWebhookService.class);
    private final String webhookUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public DiscordWebhookService(
            @Value("${discord.webhook-url:}") String webhookUrl,
            ObjectMapper objectMapper) {
        this.webhookUrl = webhookUrl;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
    }

    public void sendJoinNotification(String playerName, String characterName, String roomId) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }

        try {
            String time = ZonedDateTime.now(ZoneId.of("UTC"))
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'UTC'"));

            String content = String.format("**New User Joined!** \uD83D\uDE80\n" +
                            "**Name:** %s\n" +
                            "**Character:** %s\n" +
                            "**Room:** `%s`\n" +
                            "**Time:** %s",
                    playerName, characterName, roomId, time);

            Map<String, Object> embed = new HashMap<>();
            embed.put("title", "User Joined Room");
            embed.put("description", content);
            embed.put("color", 5814783); // A nice Discord Blurple color

            Map<String, Object> payload = new HashMap<>();
            payload.put("embeds", List.of(embed));

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webhookUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(response -> {
                        if (response.statusCode() >= 400) {
                            logger.error("Failed to send Discord webhook. Status: {}, Body: {}", 
                                    response.statusCode(), response.body());
                        }
                    })
                    .exceptionally(e -> {
                        logger.error("Error sending Discord webhook", e);
                        return null;
                    });

        } catch (Exception e) {
            logger.error("Failed to prepare Discord webhook payload", e);
        }
    }
}
