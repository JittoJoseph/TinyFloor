package com.spatialmeet.service;

import com.spatialmeet.model.Room;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {
    private Map<String, Room> rooms = new ConcurrentHashMap<>();

    public Room createRoom(String name) {
        String id = java.util.UUID.randomUUID().toString();
        Room room = new Room(id, name);
        rooms.put(id, room);
        return room;
    }

    public Room getRoom(String id) {
        return rooms.get(id);
    }

    public Map<String, Room> getAllRooms() {
        return rooms;
    }

    public boolean joinRoom(String roomId, String userId) {
        Room room = rooms.get(roomId);
        if (room != null) {
            room.addUser(userId);
            return true;
        }
        return false;
    }

    public void leaveRoom(String roomId, String userId) {
        Room room = rooms.get(roomId);
        if (room != null) {
            room.removeUser(userId);
        }
    }
}