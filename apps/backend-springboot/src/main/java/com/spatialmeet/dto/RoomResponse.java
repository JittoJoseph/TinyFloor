package com.spatialmeet.dto;

import com.spatialmeet.model.Room;
import com.spatialmeet.model.RoomStatus;

import java.time.Instant;

public class RoomResponse {
    private String id;
    private String name;
    private String ownerId;
    private boolean isPublic;
    private boolean hasPassword;
    private int maxPlayers;
    private int playerCount;
    private Instant createdAt;
    private Instant lastActivityAt;
    private RoomStatus status;
    private String shareCode;

    // Constructors
    public RoomResponse() {}

    public RoomResponse(Room room) {
        this.id = room.getId();
        this.name = room.getName();
        this.ownerId = room.getOwnerId();
        this.isPublic = room.isPublic();
        this.hasPassword = room.hasPassword();
        this.maxPlayers = room.getMaxPlayers();
        this.playerCount = room.getPlayerCount();
        this.createdAt = room.getCreatedAt();
        this.lastActivityAt = room.getLastActivityAt();
        this.status = room.getStatus();
        this.shareCode = room.getShareCode();
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

    public boolean isHasPassword() { return hasPassword; }
    public void setHasPassword(boolean hasPassword) { this.hasPassword = hasPassword; }

    public int getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; }

    public int getPlayerCount() { return playerCount; }
    public void setPlayerCount(int playerCount) { this.playerCount = playerCount; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(Instant lastActivityAt) { this.lastActivityAt = lastActivityAt; }

    public RoomStatus getStatus() { return status; }
    public void setStatus(RoomStatus status) { this.status = status; }

    public String getShareCode() { return shareCode; }
    public void setShareCode(String shareCode) { this.shareCode = shareCode; }
}
