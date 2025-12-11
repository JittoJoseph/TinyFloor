package com.spatialmeet.controller;

import com.spatialmeet.dto.CreateRoomRequest;
import com.spatialmeet.dto.RoomResponse;
import com.spatialmeet.model.Room;
import com.spatialmeet.model.User;
import com.spatialmeet.service.RoomService;
import com.spatialmeet.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;
    private final UserService userService;

    public RoomController(RoomService roomService, UserService userService) {
        this.roomService = roomService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<RoomResponse>> getRooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<RoomResponse> rooms = roomService.getPublicRooms(page, size);
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/search")
    public ResponseEntity<List<RoomResponse>> searchRooms(@RequestParam String query) {
        List<RoomResponse> rooms = roomService.searchRooms(query);
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomResponse> getRoom(@PathVariable String roomId) {
        Room room = roomService.getRoom(roomId);
        if (room != null) {
            return ResponseEntity.ok(new RoomResponse(room));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/share/{shareCode}")
    public ResponseEntity<RoomResponse> getRoomByShareCode(@PathVariable String shareCode) {
        RoomResponse room = roomService.getRoomByShareCode(shareCode);
        if (room != null) {
            return ResponseEntity.ok(room);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/my-rooms")
    public ResponseEntity<List<RoomResponse>> getMyRooms(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<RoomResponse> rooms = roomService.getRoomsByOwner(user.getId());
        return ResponseEntity.ok(rooms);
    }

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal User user) {
        String ownerId = user != null ? user.getId() : null;
        RoomResponse room = roomService.createRoom(request, ownerId);
        
        // Add room to user's created rooms
        if (user != null) {
            userService.addCreatedRoom(user.getId(), room.getId());
        }
        
        return ResponseEntity.ok(room);
    }

    // Legacy endpoint for backwards compatibility
    @PostMapping("/simple")
    public ResponseEntity<Room> createRoomSimple(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Room room = roomService.createRoom(name);
        return ResponseEntity.ok(room);
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<Map<String, Object>> joinRoom(
            @PathVariable String roomId,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal User user) {
        String password = payload.get("password");
        String guestName = payload.get("name");
        
        // Get the room first to check if it exists and has password
        Room room = roomService.getRoom(roomId);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Check if room is full
        if (room.isFull()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Room is full"
            ));
        }
        
        // Determine user ID
        String userId = user != null ? user.getId() : "guest_" + System.currentTimeMillis();
        
        // Join with or without password
        boolean success;
        if (room.hasPassword()) {
            success = roomService.joinRoomWithPassword(roomId, userId, password);
            if (!success) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid password"
                ));
            }
        } else {
            success = roomService.joinRoom(roomId, userId);
        }
        
        if (success) {
            // Add room to user's joined rooms
            if (user != null) {
                userService.addJoinedRoom(user.getId(), roomId);
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "roomId", roomId,
                "userId", userId
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to join room"
            ));
        }
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable String roomId,
            @RequestBody Map<String, String> payload) {
        String userId = payload.get("userId");
        if (userId != null) {
            roomService.leaveRoom(roomId, userId);
        }
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{roomId}")
    public ResponseEntity<RoomResponse> updateRoom(
            @PathVariable String roomId,
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        RoomResponse room = roomService.updateRoom(roomId, request, user.getId());
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(room);
    }

    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> deleteRoom(
            @PathVariable String roomId,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        boolean success = roomService.deleteRoom(roomId, user.getId());
        if (success) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}