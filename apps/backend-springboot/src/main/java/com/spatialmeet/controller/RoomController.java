package com.spatialmeet.controller;

import com.spatialmeet.model.Room;
import com.spatialmeet.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @GetMapping
    public ResponseEntity<List<Room>> getRooms() {
        List<Room> rooms = roomService.getAllRooms().values().stream().collect(Collectors.toList());
        return ResponseEntity.ok(rooms);
    }

    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Room room = roomService.createRoom(name);
        return ResponseEntity.ok(room);
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<String> joinRoom(@PathVariable String roomId, @RequestBody Map<String, String> payload) {
        String userId = payload.get("userId");
        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        boolean success = roomService.joinRoom(roomId, userId);
        if (success) {
            return ResponseEntity.ok("Joined");
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}