package com.spatialmeet.service;

import com.spatialmeet.dto.CreateRoomRequest;
import com.spatialmeet.dto.RoomResponse;
import com.spatialmeet.model.Room;
import com.spatialmeet.model.RoomStatus;
import com.spatialmeet.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class RoomService {
    public static final String PUBLIC_ROOM_ID = "public-room";
    private static final String PUBLIC_ROOM_NAME = "System Lobby";
    private static final List<RoomStatus> LISTABLE_PUBLIC_STATUSES = List.of(RoomStatus.ACTIVE, RoomStatus.INACTIVE);

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
        Room room = new Room(UUID.randomUUID().toString(), request.getName(), ownerId);
        room.setPublic(request.isPublic());
        room.setMaxPlayers(request.getMaxPlayers() > 0 ? request.getMaxPlayers() : defaultMaxPlayers);
        applyPassword(room, request.getPassword());

        if (room.isPublic()) {
            room.setShareCode(null);
        } else {
            room.setShareCode(generateShareCode());
        }

        Room savedRoom = roomRepository.save(room);
        activeRoomsCache.put(savedRoom.getId(), savedRoom);
        return new RoomResponse(savedRoom);
    }

    public Room createRoom(String name) {
        Room room = new Room(UUID.randomUUID().toString(), name);
        Room savedRoom = roomRepository.save(room);
        activeRoomsCache.put(savedRoom.getId(), savedRoom);
        return savedRoom;
    }

    public Room getRoom(String id) {
        Room cachedRoom = activeRoomsCache.get(id);
        if (cachedRoom != null) {
            return cachedRoom;
        }

        Optional<Room> roomOpt = roomRepository.findById(id);
        if (roomOpt.isPresent()) {
            Room room = roomOpt.get();
            activeRoomsCache.put(id, room);
            return room;
        }
        return null;
    }

    public List<RoomResponse> getPublicRooms(int page, int size) {
        if (size <= 0 || page < 0) {
            return List.of();
        }

        Room lobby = ensurePublicLobbyExists();
        List<Room> orderedRooms = roomRepository
                .findByIsPublicTrueAndStatusInOrderByLastActivityAtDesc(LISTABLE_PUBLIC_STATUSES)
                .stream()
                .sorted(publicRoomComparator())
                .collect(Collectors.toList());

        if (orderedRooms.stream().noneMatch(this::isLobbyRoom)) {
            orderedRooms.add(0, lobby);
        }

        int fromIndex = page * size;
        if (fromIndex >= orderedRooms.size()) {
            return List.of();
        }

        int toIndex = Math.min(fromIndex + size, orderedRooms.size());
        return orderedRooms.subList(fromIndex, toIndex)
                .stream()
                .map(RoomResponse::new)
                .collect(Collectors.toList());
    }

    public List<RoomResponse> searchRooms(String query) {
        return roomRepository.searchByName(query)
                .stream()
                .sorted(publicRoomComparator())
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

    public List<RoomResponse> getRoomsByIds(List<String> roomIds) {
        if (roomIds == null || roomIds.isEmpty()) {
            return List.of();
        }
        return roomRepository.findAllById(roomIds)
                .stream()
                .filter(room -> room.getStatus() != RoomStatus.DELETED)
                .map(RoomResponse::new)
                .collect(Collectors.toList());
    }

    public Map<String, Room> getAllRooms() {
        return activeRoomsCache;
    }

    public boolean joinRoom(String roomId, String userId) {
        Room room = getRoom(roomId);
        if (room != null && !room.isFull()) {
            room.addUser(userId);
            room.setStatus(RoomStatus.ACTIVE);
            Room savedRoom = roomRepository.save(room);
            activeRoomsCache.put(roomId, savedRoom);
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
        if (room == null) {
            return;
        }

        room.removeUser(userId);
        if (room.getPlayerCount() == 0) {
            room.setStatus(isLobbyRoom(room) ? RoomStatus.ACTIVE : RoomStatus.INACTIVE);
        }

        Room savedRoom = roomRepository.save(room);
        activeRoomsCache.put(roomId, savedRoom);
    }

    public RoomResponse updateRoom(String roomId, CreateRoomRequest request, String userId) {
        Room room = getRoom(roomId);
        if (room == null) {
            return null;
        }

        if (!userId.equals(room.getOwnerId())) {
            return null;
        }

        room.setName(request.getName());
        room.setMaxPlayers(request.getMaxPlayers());

        if (isLobbyRoom(room)) {
            applyLobbyInvariants(room);
        } else {
            room.setPublic(request.isPublic());
            applyPassword(room, request.getPassword());
            if (room.isPublic()) {
                room.setShareCode(null);
            } else if (room.getShareCode() == null || room.getShareCode().isBlank()) {
                room.setShareCode(generateShareCode());
            }
        }

        room.updateActivity();
        Room savedRoom = roomRepository.save(room);
        activeRoomsCache.put(roomId, savedRoom);
        return new RoomResponse(savedRoom);
    }

    public boolean deleteRoom(String roomId, String userId) {
        Room room = getRoom(roomId);
        if (room == null || isLobbyRoom(room)) {
            return false;
        }

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

    @Scheduled(fixedRateString = "${room.cleanup-interval:3600000}")
    public void cleanupInactiveRooms() {
        Instant threshold = Instant.now().minusMillis(inactiveTimeout);
        List<Room> inactiveRooms = roomRepository.findByLastActivityAtBeforeAndStatus(threshold, RoomStatus.INACTIVE);

        for (Room room : inactiveRooms) {
            if (isLobbyRoom(room)) {
                continue;
            }
            room.setStatus(RoomStatus.DELETED);
            roomRepository.save(room);
            activeRoomsCache.remove(room.getId());
        }
    }

    public void syncCache() {
        activeRoomsCache.clear();
        resetPersistedPresence();

        Room lobby = ensurePublicLobbyExists();
        activeRoomsCache.put(lobby.getId(), lobby);

        List<Room> activeRooms = roomRepository.findByIsPublicTrueAndStatusOrderByLastActivityAtDesc(RoomStatus.ACTIVE);
        for (Room room : activeRooms) {
            activeRoomsCache.put(room.getId(), room);
        }
    }

    private void resetPersistedPresence() {
        List<Room> rooms = roomRepository.findAll();
        for (Room room : rooms) {
            if (room.getStatus() == RoomStatus.DELETED) {
                continue;
            }

            boolean changed = false;
            if (room.getUsers() != null && !room.getUsers().isEmpty()) {
                room.getUsers().clear();
                changed = true;
            }

            if (isLobbyRoom(room)) {
                changed = applyLobbyInvariants(room) || changed;
            } else if (room.getStatus() == RoomStatus.ACTIVE && room.getPlayerCount() == 0) {
                room.setStatus(RoomStatus.INACTIVE);
                changed = true;
            }

            if (changed) {
                roomRepository.save(room);
            }
        }
    }

    private Room ensurePublicLobbyExists() {
        Room lobby = roomRepository.findById(PUBLIC_ROOM_ID)
                .orElseGet(() -> new Room(PUBLIC_ROOM_ID, PUBLIC_ROOM_NAME, null));

        applyLobbyInvariants(lobby);
        Room savedLobby = roomRepository.save(lobby);
        activeRoomsCache.put(savedLobby.getId(), savedLobby);
        return savedLobby;
    }

    private boolean applyLobbyInvariants(Room room) {
        boolean changed = false;

        if (!PUBLIC_ROOM_NAME.equals(room.getName())) {
            room.setName(PUBLIC_ROOM_NAME);
            changed = true;
        }
        if (room.getOwnerId() != null) {
            room.setOwnerId(null);
            changed = true;
        }
        if (!room.isPublic()) {
            room.setPublic(true);
            changed = true;
        }
        if (room.getPasswordHash() != null) {
            room.setPasswordHash(null);
            changed = true;
        }
        if (room.getShareCode() != null) {
            room.setShareCode(null);
            changed = true;
        }
        if (room.getStatus() != RoomStatus.ACTIVE) {
            room.setStatus(RoomStatus.ACTIVE);
            changed = true;
        }
        if (room.getMaxPlayers() <= 0) {
            room.setMaxPlayers(defaultMaxPlayers);
            changed = true;
        }

        return changed;
    }

    private void applyPassword(Room room, String rawPassword) {
        if (rawPassword != null && !rawPassword.isBlank()) {
            room.setPasswordHash(passwordEncoder.encode(rawPassword));
        } else {
            room.setPasswordHash(null);
        }
    }

    private boolean isLobbyRoom(Room room) {
        return PUBLIC_ROOM_ID.equals(room.getId());
    }

    private Comparator<Room> publicRoomComparator() {
        return Comparator
                .comparing((Room room) -> !isLobbyRoom(room))
                .thenComparing(Room::getLastActivityAt, Comparator.nullsLast(Comparator.reverseOrder()));
    }
}
