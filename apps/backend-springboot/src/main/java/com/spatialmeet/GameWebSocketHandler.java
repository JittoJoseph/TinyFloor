package com.spatialmeet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spatialmeet.model.Message;
import com.spatialmeet.model.Player;
import com.spatialmeet.service.RoomService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
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

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RoomService roomService;
    private final Map<String, Map<String, Player>> roomPlayers = new ConcurrentHashMap<>();
    private final Map<String, Map<String, WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToRoom = new ConcurrentHashMap<>();
    private static final String[] AVAILABLE_SPRITES = {"Adam", "Alex", "Amelia", "Bob"};
    private final java.util.Random random = new java.util.Random();
    
    // Movement batching optimization
    private final Map<String, Map<String, Player>> pendingMovements = new ConcurrentHashMap<>();
    private final ScheduledExecutorService movementBroadcaster = Executors.newSingleThreadScheduledExecutor();
    private static final long BROADCAST_INTERVAL_MS = 50; // Batch broadcasts every 50ms

    public GameWebSocketHandler(RoomService roomService) {
        this.roomService = roomService;
        startMovementBroadcaster();
    }
    
    private void startMovementBroadcaster() {
        movementBroadcaster.scheduleAtFixedRate(this::broadcastPendingMovements,
            BROADCAST_INTERVAL_MS, BROADCAST_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }
    
    private void broadcastPendingMovements() {
        pendingMovements.forEach((roomId, players) -> {
            if (players.isEmpty()) return;
            
            Map<String, WebSocketSession> sessions = roomSessions.get(roomId);
            if (sessions == null || sessions.isEmpty()) return;
            
            List<Map<String, Object>> movements = players.values().stream()
                .map(p -> {
                    Map<String, Object> movement = new HashMap<>();
                    movement.put("id", p.getId());
                    movement.put("tileX", p.getTileX());
                    movement.put("tileY", p.getTileY());
                    movement.put("direction", p.getDirection());
                    return movement;
                })
                .collect(Collectors.toList());
            
            if (movements.isEmpty()) return;
            
            try {
                Message batchMsg = new Message("movements_batch", Map.of("movements", movements));
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
            
            players.clear();
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
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Message msg = objectMapper.readValue(message.getPayload(), Message.class);
        switch (msg.getType()) {
            case "join":
                handleJoin(session, msg);
                break;
            case "move":
                handleMove(session, msg);
                break;
            case "request_call":
                handleRequestCall(session, msg);
                break;
            case "call_response":
                handleCallResponse(session, msg);
                break;
            case "webrtc_signal":
                handleWebRTCSignal(session, msg);
                break;
            case "call_ended":
                handleCallEnded(session, msg);
                break;
            case "chat":
                handleChat(session, msg);
                break;
            case "ping":
                // Heartbeat - no response needed, connection is kept alive
                break;
        }
    }

    private void handleChat(WebSocketSession session, Message msg) throws IOException {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;
        
        // Broadcast chat message to all players in the room
        broadcastToRoom(roomId, msg, null);
    }

    private void handleJoin(WebSocketSession session, Message msg) throws IOException {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;

        Map<String, Object> data = (Map<String, Object>) msg.getData();
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

        roomPlayers.get(roomId).put(playerId, player);
        roomSessions.get(roomId).put(playerId, session);
        
        List<Map<String, Object>> existingUsers = roomPlayers.get(roomId).values().stream()
            .filter(p -> !p.getId().equals(playerId))
            .map(p -> {
                Map<String, Object> user = new HashMap<>();
                user.put("id", p.getId());
                user.put("name", p.getName());
                user.put("sprite", p.getSprite());
                user.put("tileX", p.getTileX());
                user.put("tileY", p.getTileY());
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
        
        Map<String, Object> joinData = Map.of(
            "id", playerId,
            "name", player.getName(),
            "sprite", player.getSprite(),
            "tileX", spawnTileX,
            "tileY", spawnTileY
        );
        
        broadcastToRoom(roomId, new Message("user-join", joinData), playerId);
    }

    private void handleMove(WebSocketSession session, Message msg) throws IOException {
        String playerId = getPlayerIdFromSession(session);
        if (playerId == null) return;

        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;
        
        Map<String, Object> data = (Map<String, Object>) msg.getData();
        int targetTileX = ((Number) data.get("tileX")).intValue();
        int targetTileY = ((Number) data.get("tileY")).intValue();
        String direction = (String) data.get("direction");
        
        Player player = roomPlayers.get(roomId).get(playerId);
        if (player == null) return;
        
        if (Player.isValidTile(targetTileX, targetTileY)) {
            player.setTileX(targetTileX);
            player.setTileY(targetTileY);
            player.setDirection(direction);
            player.setLastSeen(System.currentTimeMillis());
            pendingMovements.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>()).put(playerId, player);
        } else {
            Map<String, Object> rejectionData = Map.of("tileX", player.getTileX(), "tileY", player.getTileY());
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(new Message("movement-rejected", rejectionData))));
        }
    }

    private void handleRequestCall(WebSocketSession session, Message msg) throws IOException {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;

        Map<String, Object> data = (Map<String, Object>) msg.getData();
        String from = (String) data.get("from");
        String to = (String) data.get("to");
        String callType = (String) data.get("callType");

        Player fromPlayer = roomPlayers.get(roomId).get(from);
        if (fromPlayer != null && roomPlayers.get(roomId).containsKey(to)) {
            Message incoming = new Message("incoming_call", Map.of("from", from, "fromName", fromPlayer.getName(), "callType", callType));
            WebSocketSession toSession = roomSessions.get(roomId).get(to);
            if (toSession != null) {
                toSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(incoming)));
            }
        }
    }

    private void handleCallResponse(WebSocketSession session, Message msg) throws IOException {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;

        Map<String, Object> data = (Map<String, Object>) msg.getData();
        String from = (String) data.get("from");
        String to = (String) data.get("to");
        boolean accepted = (Boolean) data.get("accepted");

        Message response = new Message("call_response", Map.of("from", from, "to", to, "accepted", accepted));
        WebSocketSession fromSession = roomSessions.get(roomId).get(from);
        if (fromSession != null) {
            fromSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        }
    }

    private void handleWebRTCSignal(WebSocketSession session, Message msg) throws IOException {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;

        Map<String, Object> data = (Map<String, Object>) msg.getData();
        String from = (String) data.get("from");
        String to = (String) data.get("to");
        Object signalData = data.get("data");

        Message signal = new Message("webrtc_signal", Map.of("from", from, "to", to, "data", signalData));
        WebSocketSession toSession = roomSessions.get(roomId).get(to);
        if (toSession != null) {
            toSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(signal)));
        }
    }

    private void handleCallEnded(WebSocketSession session, Message msg) throws IOException {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;

        Map<String, Object> data = (Map<String, Object>) msg.getData();
        String from = (String) data.get("from");
        String to = (String) data.get("to");
        String reason = (String) data.get("reason");

        // Relay to both
        Message ended = new Message("call_ended", Map.of("from", from, "to", to, "reason", reason));
        broadcastToRoom(roomId, ended, null);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        String playerId = getPlayerIdFromSession(session);
        
        if (playerId != null) {
            String roomId = sessionToRoom.get(session.getId());
            if (roomId != null) {
                roomPlayers.get(roomId).remove(playerId);
                roomSessions.get(roomId).remove(playerId);
                roomService.leaveRoom(roomId, playerId);
                
                Message left = new Message("user-left", Map.of("id", playerId));
                broadcastToRoom(roomId, left, null);
            }
        }
        sessionToRoom.remove(session.getId());
    }

    private void broadcastToRoom(String roomId, Message message, String excludePlayerId) throws IOException {
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

    private String getPlayerIdFromSession(WebSocketSession session) {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId != null) {
            return roomSessions.get(roomId).entrySet().stream()
                .filter(e -> e.getValue().equals(session))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
        }
        return null;
    }
}