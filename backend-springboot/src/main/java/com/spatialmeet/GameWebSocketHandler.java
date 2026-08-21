package com.spatialmeet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spatialmeet.model.Message;
import com.spatialmeet.model.Player;
import com.spatialmeet.service.RoomService;
import com.spatialmeet.service.UserService;
import com.spatialmeet.service.DiscordWebhookService;
import com.spatialmeet.service.GeoLocationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(GameWebSocketHandler.class);

    private final ObjectMapper objectMapper;
    private final RoomService roomService;
    private final UserService userService;
    private final DiscordWebhookService discordWebhookService;
    private final GeoLocationService geoLocationService;
    private final Map<String, Map<String, Player>> roomPlayers = new ConcurrentHashMap<>();
    private final Map<String, Map<String, WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToRoom = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToPlayer = new ConcurrentHashMap<>();
    private static final String[] AVAILABLE_SPRITES = {"Adam", "Alex", "Amelia", "Bob"};
    private final java.util.Random random = new java.util.Random();
    
    // Movement batching optimization
    private final Map<String, Map<String, Movement>> pendingMovements = new ConcurrentHashMap<>();
    
    private record Movement(String id, int tileX, int tileY) {}
    
    private final ScheduledExecutorService movementBroadcaster = Executors.newSingleThreadScheduledExecutor();
    private final ScheduledExecutorService cleanupExecutor = Executors.newSingleThreadScheduledExecutor();
    private static final long BROADCAST_INTERVAL_MS = 50; // Batch broadcasts every 50ms
    private static final long CLEANUP_INTERVAL_MS = 30000; // Clean up every 30 seconds
    private static final long INACTIVE_TIMEOUT_MS = 90000; // 90 seconds timeout

    public GameWebSocketHandler(RoomService roomService, UserService userService, DiscordWebhookService discordWebhookService, GeoLocationService geoLocationService, ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.roomService = roomService;
        this.userService = userService;
        this.discordWebhookService = discordWebhookService;
        this.geoLocationService = geoLocationService;
        startMovementBroadcaster();
        startCleanupTask();
    }
    
    private void startCleanupTask() {
        cleanupExecutor.scheduleAtFixedRate(this::cleanupInactivePlayers,
            CLEANUP_INTERVAL_MS, CLEANUP_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }
    
    private void startMovementBroadcaster() {
        movementBroadcaster.scheduleAtFixedRate(this::broadcastPendingMovements,
            BROADCAST_INTERVAL_MS, BROADCAST_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }
    
    private void cleanupInactivePlayers() {
        long now = System.currentTimeMillis();
        roomPlayers.forEach((roomId, players) -> {
            players.forEach((playerId, player) -> {
                if (now - player.getLastSeen() > INACTIVE_TIMEOUT_MS) {
                    WebSocketSession session = roomSessions.getOrDefault(roomId, Collections.emptyMap()).get(playerId);
                    removePlayerAndBroadcast(roomId, playerId, session);
                }
            });
            if (players.isEmpty()) {
                roomPlayers.remove(roomId);
                roomSessions.remove(roomId);
                pendingMovements.remove(roomId);
            }
        });
    }
    
    private void broadcastPendingMovements() {
        pendingMovements.forEach((roomId, movements) -> {
            if (movements.isEmpty()) return;
            
            Map<String, WebSocketSession> sessions = roomSessions.get(roomId);
            if (sessions == null || sessions.isEmpty()) return;
            
            List<Map<String, Object>> movementList = movements.values().stream()
                .map(m -> Map.<String, Object>of("id", m.id(), "tileX", m.tileX(), "tileY", m.tileY()))
                .collect(Collectors.toList());
            
            if (movementList.isEmpty()) return;
            
            try {
                Message batchMsg = new Message("movements_batch", Map.of("movements", movementList));
                String json = objectMapper.writeValueAsString(batchMsg);
                TextMessage textMsg = new TextMessage(json);
                
                sessions.values().forEach(session -> {
                    if (session.isOpen()) {
                        try {
                            session.sendMessage(textMsg);
                        } catch (IOException ignored) {}
                    }
                });
            } catch (Exception ignored) {}
            
            movements.clear();
        });
    }

    private String getRoomIdFromSession(WebSocketSession session) {
        String path = session.getUri().getPath();
        String[] parts = path.split("/");
        return parts[parts.length - 1]; // /ws/{roomId}
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String roomId = getRoomIdFromSession(session);
        sessionToRoom.put(session.getId(), roomId);
        roomPlayers.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>());
        roomSessions.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>());
        logger.info("WebSocket connection established for room: {}", roomId);
    }

    @Override
    @SuppressWarnings("unchecked")
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            Message msg = objectMapper.readValue(message.getPayload(), Message.class);
            updateLastSeen(session);
            
            switch (msg.getType()) {
                case "join": handleJoin(session, msg); break;
                case "move": handleMove(session, msg); break;
                case "walk_to": handleWalkTo(session, msg); break;
                case "call_invite":
                case "call_accept":
                case "call_decline":
                case "call_signal":
                case "call_end": relayToPeer(session, msg); break;
                case "chat": handleChat(session, msg); break;
                case "status_change": handleStatusChange(session, msg); break;
                case "ping":
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(new Message("pong", Map.of()))));
                    break;
            }
        } catch (Exception e) {
            logger.error("Error handling message: {}", e.getMessage());
        }
    }

    private void handleChat(WebSocketSession session, Message msg) throws IOException {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;
        
        // Broadcast chat message to all players in the room
        broadcastToRoom(roomId, msg, null);
        
        // Forward to Discord
        try {
            Map<String, Object> data = msg.getData();
            if (data != null) {
                String senderName = (String) data.get("senderName");
                String content = (String) data.get("content");
                if (senderName != null && content != null) {
                    discordWebhookService.sendChatMessage(senderName, content);
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to forward chat to Discord: {}", e.getMessage());
        }
    }

    private void handleStatusChange(WebSocketSession session, Message msg) throws IOException {
        String playerId = getPlayerIdFromSession(session);
        if (playerId == null) return;

        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;

        Map<String, Object> data = msg.getData();
        String newStatus = (String) data.get("status");
        
        // Validate status
        if (newStatus == null || (!newStatus.equals("available") && !newStatus.equals("busy") && 
            !newStatus.equals("away") && !newStatus.equals("in_call"))) {
            return;
        }

        Player player = roomPlayers.get(roomId).get(playerId);
        if (player == null) return;

        player.setStatus(newStatus);

        Map<String, Object> statusData = new HashMap<>();
        statusData.put("id", playerId);
        statusData.put("status", newStatus);
        broadcastToRoom(roomId, new Message("status_changed", statusData), null);
    }

    private boolean isGuestPlayer(String userId) {
        if (userId == null || userId.startsWith("player_")) return true;
        try {
            return userService.findById(userId).map(com.spatialmeet.model.User::isGuest).orElse(true);
        } catch (Exception e) {
            return true;
        }
    }

    private void handleJoin(WebSocketSession session, Message msg) throws IOException {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;

        Map<String, Object> data = msg.getData();
        String playerName = (String) data.get("name");
        String sprite = (String) data.get("sprite");
        Integer clientTileX = data.containsKey("tileX") ? ((Number) data.get("tileX")).intValue() : null;
        Integer clientTileY = data.containsKey("tileY") ? ((Number) data.get("tileY")).intValue() : null;
        String userId = (String) data.get("userId");
        
        String playerId = userId != null ? userId : "player_" + System.currentTimeMillis() + "_" + random.nextInt(1000);
        
        int spawnTileX = (clientTileX != null && Player.isValidTile(clientTileX, clientTileY != null ? clientTileY : 5)) ? clientTileX : 5;
        int spawnTileY = (clientTileY != null && Player.isValidTile(spawnTileX, clientTileY)) ? clientTileY : 5;
        
        Player player = new Player(playerId, playerName != null ? playerName : "User", spawnTileX, spawnTileY);
        player.setSprite(sprite != null ? sprite : AVAILABLE_SPRITES[random.nextInt(AVAILABLE_SPRITES.length)]);
        player.setGuest(isGuestPlayer(userId));

        roomPlayers.get(roomId).put(playerId, player);
        roomSessions.get(roomId).put(playerId, session);
        sessionToPlayer.put(session.getId(), playerId);
        
        boolean joined = roomService.joinRoom(roomId, playerId);
        if (!joined) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(new Message("join-failed", Map.of("reason", "Room is full or invalid")))));
            session.close();
            return;
        }
        
        // Track collaborators - record that this user met the existing users in this room
        List<String> existingUserIds = roomPlayers.get(roomId).values().stream()
            .filter(p -> !p.getId().equals(playerId))
            .map(Player::getId)
            .collect(Collectors.toList());
        
        if (!existingUserIds.isEmpty() && userId != null && !userId.startsWith("player_")) {
            // Only track for authenticated users (not anonymous players)
            try {
                userService.recordRoomCollaboration(userId, existingUserIds, roomId);
            } catch (Exception e) {
                // Don't fail the join if collaborator tracking fails
                logger.warn("Failed to record room collaboration: {}", e.getMessage());
            }
        }
        
        // Notify via Discord Webhook
        com.spatialmeet.model.Room room = roomService.getRoom(roomId);
        String roomName = (room != null) ? room.getName() : roomId;
        geoLocationService.resolve(session.getHandshakeHeaders(), session.getRemoteAddress())
            .thenAccept(region -> discordWebhookService.sendJoinNotification(
                player.getName(), player.getSprite(), roomName, region));
        
        logger.info("Player {} joined room {}", playerId, roomId);
        
        List<Map<String, Object>> existingUsers = roomPlayers.get(roomId).values().stream()
            .filter(p -> !p.getId().equals(playerId))
            .map(p -> {
                Map<String, Object> user = new HashMap<>();
                user.put("id", p.getId());
                user.put("name", p.getName());
                user.put("sprite", p.getSprite());
                user.put("tileX", p.getTileX());
                user.put("tileY", p.getTileY());
                user.put("status", p.getStatus());
                user.put("guest", p.isGuest());
                return user;
            })
            .collect(Collectors.toList());
            
        Map<String, Object> responseData = Map.of(
            "tileX", spawnTileX,
            "tileY", spawnTileY,
            "sprite", player.getSprite(),
            "existingUsers", existingUsers
        );
        
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(new Message("space-joined", responseData))));
        
        Map<String, Object> joinData = new HashMap<>();
        joinData.put("id", playerId);
        joinData.put("name", player.getName());
        joinData.put("sprite", player.getSprite());
        joinData.put("tileX", spawnTileX);
        joinData.put("tileY", spawnTileY);
        joinData.put("status", player.getStatus());
        joinData.put("guest", player.isGuest());
        
        broadcastToRoom(roomId, new Message("user-join", joinData), playerId);
    }

    private void handleMove(WebSocketSession session, Message msg) throws IOException {
        Player player = resolvePlayer(session);
        if (player == null) return;

        String roomId = sessionToRoom.get(session.getId());
        Map<String, Object> data = msg.getData();
        int targetTileX = ((Number) data.get("tileX")).intValue();
        int targetTileY = ((Number) data.get("tileY")).intValue();

        if (!Player.isValidTile(targetTileX, targetTileY)) {
            rejectMove(session, player);
            return;
        }

        player.setTileX(targetTileX);
        player.setTileY(targetTileY);
        pendingMovements.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>())
            .put(player.getId(), new Movement(player.getId(), targetTileX, targetTileY));
    }

    private void handleWalkTo(WebSocketSession session, Message msg) throws IOException {
        Player player = resolvePlayer(session);
        if (player == null) return;

        String roomId = sessionToRoom.get(session.getId());
        Map<String, Object> data = msg.getData();
        int targetTileX = ((Number) data.get("tileX")).intValue();
        int targetTileY = ((Number) data.get("tileY")).intValue();

        if (!Player.isValidTile(targetTileX, targetTileY)) {
            rejectMove(session, player);
            return;
        }

        player.setTileX(targetTileX);
        player.setTileY(targetTileY);

        Map<String, Movement> pending = pendingMovements.get(roomId);
        if (pending != null) pending.remove(player.getId());

        Map<String, Object> walkData = new HashMap<>();
        walkData.put("id", player.getId());
        walkData.put("tileX", targetTileX);
        walkData.put("tileY", targetTileY);
        broadcastToRoom(roomId, new Message("walk_to", walkData), player.getId());
    }

    private Player resolvePlayer(WebSocketSession session) {
        String playerId = getPlayerIdFromSession(session);
        String roomId = sessionToRoom.get(session.getId());
        if (playerId == null || roomId == null) return null;

        Map<String, Player> players = roomPlayers.get(roomId);
        return players != null ? players.get(playerId) : null;
    }

    private void rejectMove(WebSocketSession session, Player player) throws IOException {
        Map<String, Object> rejectionData = Map.of("tileX", player.getTileX(), "tileY", player.getTileY());
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(new Message("movement-rejected", rejectionData))));
    }

    private void relayToPeer(WebSocketSession session, Message msg) throws IOException {
        Player sender = resolvePlayer(session);
        if (sender == null) return;

        String roomId = sessionToRoom.get(session.getId());
        Object target = msg.getData().get("to");
        if (!(target instanceof String peerId)) return;

        WebSocketSession peerSession = roomSessions.getOrDefault(roomId, Collections.emptyMap()).get(peerId);

        if (peerSession == null || !peerSession.isOpen()) {
            if (!"call_end".equals(msg.getType())) {
                sendTo(session, new Message("call_end", Map.of("from", peerId)));
            }
            return;
        }

        Map<String, Object> payload = new HashMap<>(msg.getData());
        payload.remove("to");
        payload.put("from", sender.getId());
        payload.put("fromName", sender.getName());
        sendTo(peerSession, new Message(msg.getType(), payload));
    }

    private void sendTo(WebSocketSession session, Message message) throws IOException {
        if (session.isOpen()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        String playerId = sessionToPlayer.get(session.getId());
        String roomId = sessionToRoom.get(session.getId());
        
        if (playerId != null && roomId != null) {
            removePlayerAndBroadcast(roomId, playerId, session);
        } else {
            sessionToRoom.remove(session.getId());
            sessionToPlayer.remove(session.getId());
        }
    }

    private void removePlayerAndBroadcast(String roomId, String playerId, WebSocketSession session) {
        if (session != null) {
            sessionToPlayer.remove(session.getId());
            sessionToRoom.remove(session.getId());
        }
        
        Map<String, Player> players = roomPlayers.get(roomId);
        if (players != null) players.remove(playerId);
        
        Map<String, WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions != null) sessions.remove(playerId);
        
        roomService.leaveRoom(roomId, playerId);
        
        try {
            broadcastToRoom(roomId, new Message("user-left", Map.of("id", playerId)), null);
            logger.info("Player {} left room {}", playerId, roomId);
        } catch (IOException ignored) {}
    }

    private void broadcastToRoom(String roomId, Message message, String excludePlayerId) throws IOException {
        // Ensures messages are only sent to users in the same room for data encapsulation
        Map<String, WebSocketSession> roomSess = roomSessions.get(roomId);
        if (roomSess != null) {
            String json = objectMapper.writeValueAsString(message);
            TextMessage textMsg = new TextMessage(json);
            roomSess.entrySet().stream()
                .filter(e -> !e.getKey().equals(excludePlayerId))
                .forEach(e -> {
                    try {
                        if (e.getValue().isOpen()) {
                            e.getValue().sendMessage(textMsg);
                        }
                    } catch (IOException ignored) {}
                });
        }
    }

    private void updateLastSeen(WebSocketSession session) {
        String playerId = getPlayerIdFromSession(session);
        if (playerId != null) {
            String roomId = sessionToRoom.get(session.getId());
            if (roomId != null) {
                Player player = roomPlayers.get(roomId).get(playerId);
                if (player != null) {
                    player.setLastSeen(System.currentTimeMillis());
                }
            }
        }
    }

    private String getPlayerIdFromSession(WebSocketSession session) {
        return sessionToPlayer.get(session.getId());
    }
}