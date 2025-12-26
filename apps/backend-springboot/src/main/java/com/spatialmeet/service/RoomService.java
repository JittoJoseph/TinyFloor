package com.spatialmeet.service;

import com.spatialmeet.dto.CreateRoomRequest;
import com.spatialmeet.dto.RoomResponse;
import com.spatialmeet.model.Room;
import com.spatialmeet.model.RoomSettings;
import com.spatialmeet.model.RoomStatus;
import com.spatialmeet.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class RoomService {
    
    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;
    
    // In-memory cache for active rooms (for real-time player tracking)
    private final Map<String, Room> activeRoomsCache = new ConcurrentHashMap<>();
    
    @Value("${room.max-players:20}")
    private int defaultMaxPlayers;
    
    @Value("${room.max-public-rooms:50}")
    private int maxPublicRooms;
    
    @Value("${room.cache-max-size:100}")
    private int maxCacheSize;
    
    @Value("${room.inactive-timeout:604800000}")
    private long inactiveTimeout;

    public RoomService(RoomRepository roomRepository, PasswordEncoder passwordEncoder) {
        this.roomRepository = roomRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public RoomResponse createRoom(CreateRoomRequest request, String ownerId) {
        String id = UUID.randomUUID().toString();
        Room room = new Room(id, request.getName(), ownerId);
        room.setPublic(request.isPublic());
        room.setMaxPlayers(request.getMaxPlayers() > 0 ? request.getMaxPlayers() : defaultMaxPlayers);
        
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            room.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        
        // Generate share code for private rooms
        if (!request.isPublic()) {
            room.setShareCode(generateShareCode());
        }
        
        // Set room settings
        if (request.getSettings() != null) {
            RoomSettings settings = new RoomSettings();
            settings.setAllowGuests(request.getSettings().isAllowGuests());
            settings.setRequireApproval(request.getSettings().isRequireApproval());
            settings.setEnableVideo(request.getSettings().isEnableVideo());
            settings.setEnableAudio(request.getSettings().isEnableAudio());
            settings.setEnableChat(request.getSettings().isEnableChat());
            settings.setWelcomeMessage(request.getSettings().getWelcomeMessage());
            settings.setMapTheme(request.getSettings().getMapTheme());
            room.setSettings(settings);
        } else {
            room.setSettings(new RoomSettings());
        }
        
        Room savedRoom = roomRepository.save(room);
        activeRoomsCache.put(savedRoom.getId(), savedRoom);
        
        return new RoomResponse(savedRoom);
    }

    public Room createRoom(String name) {
        String id = UUID.randomUUID().toString();
        Room room = new Room(id, name);
        room.setSettings(new RoomSettings());
        Room savedRoom = roomRepository.save(room);
        activeRoomsCache.put(savedRoom.getId(), savedRoom);
        return savedRoom;
    }

    public Room getRoom(String id) {
        // Check cache first
        Room cachedRoom = activeRoomsCache.get(id);
        if (cachedRoom != null) {
            return cachedRoom;
        }
        
        // Fall back to database
        Optional<Room> roomOpt = roomRepository.findById(id);
        if (roomOpt.isPresent()) {
            Room room = roomOpt.get();
            activeRoomsCache.put(id, room);
            return room;
        }
        return null;
    }

    public List<RoomResponse> getPublicRooms(int page, int size) {
        return roomRepository.findByIsPublicTrueAndStatusOrderByLastActivityAtDesc(
                RoomStatus.ACTIVE, PageRequest.of(page, size))
                .stream()
                .map(RoomResponse::new)
                .collect(Collectors.toList());
    }

    public List<RoomResponse> searchRooms(String query) {
        return roomRepository.searchByName(query)
                .stream()
                .map(RoomResponse::new)
                .collect(Collectors.toList());
    }

    public RoomResponse getRoomByShareCode(String shareCode) {
        return roomRepository.findByShareCode(shareCode)
                .map(RoomResponse::new)
                .orElse(null);
    }

    public List<RoomResponse> getRoomsByOwner(String ownerId) {
        return roomRepository.findByOwnerId(ownerId)
                .stream()
                .map(RoomResponse::new)
                .collect(Collectors.toList());
    }

    public Map<String, Room> getAllRooms() {
        // For backwards compatibility - return active rooms from cache
        return activeRoomsCache;
    }

    public boolean joinRoom(String roomId, String userId) {
        Room room = getRoom(roomId);
        if (room != null && !room.isFull()) {
            room.addUser(userId);
            room.setStatus(RoomStatus.ACTIVE);
            roomRepository.save(room);
            activeRoomsCache.put(roomId, room);
            return true;
        }
        return false;
    }

    public boolean joinRoomWithPassword(String roomId, String userId, String password) {
        Room room = getRoom(roomId);
        if (room != null && room.hasPassword()) {
            if (passwordEncoder.matches(password, room.getPasswordHash())) {
                return joinRoom(roomId, userId);
            }
            return false;
        }
        return joinRoom(roomId, userId);
    }

    public void leaveRoom(String roomId, String userId) {
        Room room = getRoom(roomId);
        if (room != null) {
            room.removeUser(userId);
            
            if (room.getPlayerCount() == 0) {
                room.setStatus(RoomStatus.INACTIVE);
            }
            
            roomRepository.save(room);
            activeRoomsCache.put(roomId, room);
        }
    }

    public RoomResponse updateRoom(String roomId, CreateRoomRequest request, String userId) {
        Room room = getRoom(roomId);
        if (room == null) {
            return null;
        }
        
        // Check if user is owner
        if (!userId.equals(room.getOwnerId())) {
            return null;
        }
        
        room.setName(request.getName());
        room.setPublic(request.isPublic());
        room.setMaxPlayers(request.getMaxPlayers());
        
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            room.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        
        room.updateActivity();
        Room savedRoom = roomRepository.save(room);
        activeRoomsCache.put(roomId, savedRoom);
        
        return new RoomResponse(savedRoom);
    }

    public boolean deleteRoom(String roomId, String userId) {
        Room room = getRoom(roomId);
        if (room == null) {
            return false;
        }
        
        // Check if user is owner
        if (!userId.equals(room.getOwnerId())) {
            return false;
        }
        
        room.setStatus(RoomStatus.DELETED);
        roomRepository.save(room);
        activeRoomsCache.remove(roomId);
        return true;
    }

    private String generateShareCode() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    // Scheduled cleanup of inactive rooms
    @Scheduled(fixedRateString = "${room.cleanup-interval:3600000}")
    public void cleanupInactiveRooms() {
        Instant threshold = Instant.now().minusMillis(inactiveTimeout);
        List<Room> inactiveRooms = roomRepository.findByLastActivityAtBeforeAndStatus(threshold, RoomStatus.INACTIVE);
        
        for (Room room : inactiveRooms) {
            room.setStatus(RoomStatus.DELETED);
            roomRepository.save(room);
            activeRoomsCache.remove(room.getId());
        }
    }

    // Sync cache with database on startup
    public void syncCache() {
        List<Room> activeRooms = roomRepository.findByIsPublicTrueAndStatusOrderByLastActivityAtDesc(RoomStatus.ACTIVE);
        for (Room room : activeRooms) {
            activeRoomsCache.put(room.getId(), room);
        }
    }
}