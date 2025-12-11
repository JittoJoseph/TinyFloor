package com.spatialmeet.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "rooms")
public class Room {
    @Id
    private String id;
    
    @Indexed
    private String name;
    
    private String ownerId;
    
    private boolean isPublic = true;
    
    private String passwordHash;
    
    private int maxPlayers = 20;
    
    private Instant createdAt;
    
    private Instant lastActivityAt;
    
    private List<String> users = new ArrayList<>();
    
    private RoomSettings settings;
    
    private RoomStatus status = RoomStatus.ACTIVE;
    
    private String shareCode;

    // Constructors
    public Room() {
        this.createdAt = Instant.now();
        this.lastActivityAt = Instant.now();
    }

    public Room(String id, String name) {
        this();
        this.id = id;
        this.name = name;
    }

    public Room(String id, String name, String ownerId) {
        this(id, name);
        this.ownerId = ownerId;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public boolean isPublic() { return isPublic; }
    public void setPublic(boolean isPublic) { this.isPublic = isPublic; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public int getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(Instant lastActivityAt) { this.lastActivityAt = lastActivityAt; }

    public List<String> getUsers() { return users; }
    public void setUsers(List<String> users) { this.users = users; }

    public RoomSettings getSettings() { return settings; }
    public void setSettings(RoomSettings settings) { this.settings = settings; }

    public RoomStatus getStatus() { return status; }
    public void setStatus(RoomStatus status) { this.status = status; }

    public String getShareCode() { return shareCode; }
    public void setShareCode(String shareCode) { this.shareCode = shareCode; }

    public void addUser(String userId) {
        if (!users.contains(userId)) {
            users.add(userId);
            this.lastActivityAt = Instant.now();
        }
    }

    public void removeUser(String userId) {
        users.remove(userId);
        this.lastActivityAt = Instant.now();
    }

    public int getPlayerCount() {
        return users.size();
    }

    public boolean isFull() {
        return users.size() >= maxPlayers;
    }

    public boolean hasPassword() {
        return passwordHash != null && !passwordHash.isEmpty();
    }

    public void updateActivity() {
        this.lastActivityAt = Instant.now();
    }
}
