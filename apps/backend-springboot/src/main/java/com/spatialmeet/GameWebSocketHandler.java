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

    public GameWebSocketHandler(RoomService roomService) {
        this.roomService = roomService;
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
        Integer clientSpawnX = data.containsKey("x") ? (Integer) data.get("x") : null;
        Integer clientSpawnY = data.containsKey("y") ? (Integer) data.get("y") : null;
        String userId = (String) data.get("userId");
        
        // Generate a unique player ID
        String playerId = userId != null ? userId : "player_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1000);
        
        // Create player at spawn position
        int spawnX = clientSpawnX != null ? clientSpawnX : 160;
        int spawnY = clientSpawnY != null ? clientSpawnY : 160;
        Player player = new Player(playerId, playerName != null ? playerName : "User", spawnX, spawnY);
        
        // Assign sprite
        if (sprite != null) {
            player.setSprite(sprite);
        } else {
            player.setSprite(AVAILABLE_SPRITES[random.nextInt(AVAILABLE_SPRITES.length)]);
        }

        roomPlayers.get(roomId).put(playerId, player);
        roomSessions.get(roomId).put(playerId, session);
        
        // Send space-joined response with spawn position and existing users
        List<Map<String, Object>> existingUsers = roomPlayers.get(roomId).values().stream()
            .filter(p -> !p.getId().equals(playerId))
            .map(p -> {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", p.getId());
                userData.put("name", p.getName());
                userData.put("sprite", p.getSprite());
                userData.put("x", p.getTileX());
                userData.put("y", p.getTileY());
                return userData;
            })
            .collect(Collectors.toList());
            
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("spawnX", spawnX);
        responseData.put("spawnY", spawnY);
        responseData.put("sprite", sprite);
        responseData.put("existingUsers", existingUsers);
        
        Message response = new Message("space-joined", responseData);
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        
        // Broadcast user-join to other players in the room
        Map<String, Object> joinData = new HashMap<>();
        joinData.put("id", playerId);
        joinData.put("name", player.getName());
        joinData.put("sprite", player.getSprite());
        joinData.put("x", spawnX);
        joinData.put("y", spawnY);
        
        Message joinMessage = new Message("user-join", joinData);
        broadcastToRoom(roomId, joinMessage, playerId);
    }

    private void handleMove(WebSocketSession session, Message msg) throws IOException {
        String playerId = getPlayerIdFromSession(session);
        if (playerId == null) return;

        String roomId = sessionToRoom.get(session.getId());
        if (roomId == null) return;
        
        Map<String, Object> data = (Map<String, Object>) msg.getData();
        int targetX = ((Number) data.get("x")).intValue();
        int targetY = ((Number) data.get("y")).intValue();
        String direction = (String) data.get("direction");
        
        Player player = roomPlayers.get(roomId).get(playerId);
        if (player == null) return;
        
        // Validate movement (pixel-based bounds and collision check)
        boolean isValidMove = validateMovement(targetX, targetY, playerId, roomId);
        
        if (isValidMove) {
            // Update player position (store as pixels)
            player.setTileX(targetX);
            player.setTileY(targetY);
            player.setLastSeen(System.currentTimeMillis());
            
            // Broadcast movement to all clients
            Map<String, Object> movementData = new HashMap<>();
            movementData.put("id", playerId);
            movementData.put("x", targetX);
            movementData.put("y", targetY);
            movementData.put("direction", direction);
            
            Message movement = new Message("movement", movementData);
            broadcastToRoom(roomId, movement, null);
        } else {
            // Send movement rejection with corrected position
            Map<String, Object> rejectionData = new HashMap<>();
            rejectionData.put("x", player.getTileX());
            rejectionData.put("y", player.getTileY());
            
            Message rejection = new Message("movement-rejected", rejectionData);
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(rejection)));
        }
    }
    
    private boolean validateMovement(int x, int y, String playerId, String roomId) {
        // Basic bounds check (1760x800 pixel area, with 16px padding for player radius)
        if (x < 16 || x >= 1760 - 16 || y < 16 || y >= 800 - 16) {
            return false;
        }
        
        // Check for wall collision (edges of the map)
        // For pixel-based movement, walls are at the edges
        if (x <= 32 || x >= 1760 - 32 || y <= 32 || y >= 800 - 32) {
            return false;
        }
        
        // Check for collision with other players (32px radius around each player)
        for (Player other : roomPlayers.get(roomId).values()) {
            if (!other.getId().equals(playerId)) {
                int dx = x - other.getTileX();
                int dy = y - other.getTileY();
                double distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 32) { // 32px minimum distance (16px radius * 2)
                    return false;
                }
            }
        }
        
        return true;
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
            // Relay incoming_call to target
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

        // Relay to caller
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

        // Relay signal
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
                
                // Update room service to decrease player count
                roomService.leaveRoom(roomId, playerId);
                
                // Broadcast user-left to remaining players in room
                Map<String, Object> leftData = new HashMap<>();
                leftData.put("id", playerId);
                
                Message left = new Message("user-left", leftData);
                broadcastToRoom(roomId, left, null);
            }
        }
        sessionToRoom.remove(session.getId());
    }

    private void broadcastToRoom(String roomId, Message message, String excludePlayerId) throws IOException {
        Map<String, WebSocketSession> roomSess = roomSessions.get(roomId);
        if (roomSess != null) {
            for (Map.Entry<String, WebSocketSession> entry : roomSess.entrySet()) {
                if (!entry.getKey().equals(excludePlayerId)) {
                    entry.getValue().sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
                }
            }
        }
    }

    private String getPlayerIdFromSession(WebSocketSession session) {
        String roomId = sessionToRoom.get(session.getId());
        if (roomId != null) {
            Map<String, WebSocketSession> roomSess = roomSessions.get(roomId);
            for (Map.Entry<String, WebSocketSession> entry : roomSess.entrySet()) {
                if (entry.getValue().equals(session)) {
                    return entry.getKey();
                }
            }
        }
        return null;
    }
}