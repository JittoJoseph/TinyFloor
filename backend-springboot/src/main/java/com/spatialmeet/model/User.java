package com.spatialmeet.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
public class User {
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String username;
    
    @Indexed(unique = true, sparse = true)
    private String email;
    
    private String passwordHash;
    
    private String displayName;
    
    private AvatarPreferences avatarPreferences;
    
    private List<String> createdRooms = new ArrayList<>();
    
    private List<String> joinedRooms = new ArrayList<>();
    
    private List<RecentCollaborator> recentCollaborators = new ArrayList<>();
    
    private boolean isGuest = false;
    
    private Instant createdAt;
    
    private Instant lastActiveAt;
    
    private UserStatus status = UserStatus.OFFLINE;

    // Constructors
    public User() {
        this.createdAt = Instant.now();
        this.lastActiveAt = Instant.now();
    }

    public User(String username, String displayName) {
        this();
        this.username = username;
        this.displayName = displayName;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public AvatarPreferences getAvatarPreferences() { return avatarPreferences; }
    public void setAvatarPreferences(AvatarPreferences avatarPreferences) { this.avatarPreferences = avatarPreferences; }

    public List<String> getCreatedRooms() { return createdRooms; }
    public void setCreatedRooms(List<String> createdRooms) { this.createdRooms = createdRooms; }

    public List<String> getJoinedRooms() { return joinedRooms; }
    public void setJoinedRooms(List<String> joinedRooms) { this.joinedRooms = joinedRooms; }

    public boolean isGuest() { return isGuest; }
    public void setGuest(boolean guest) { isGuest = guest; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(Instant lastActiveAt) { this.lastActiveAt = lastActiveAt; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }

    public void addCreatedRoom(String roomId) {
        if (!createdRooms.contains(roomId)) {
            createdRooms.add(roomId);
        }
    }

    public void addJoinedRoom(String roomId) {
        if (!joinedRooms.contains(roomId)) {
            joinedRooms.add(roomId);
        }
    }

    public List<RecentCollaborator> getRecentCollaborators() { return recentCollaborators; }
    public void setRecentCollaborators(List<RecentCollaborator> recentCollaborators) { 
        this.recentCollaborators = recentCollaborators; 
    }

    /**
     * Add or update a collaborator. Keeps max 20 recent collaborators.
     */
    public void addCollaborator(String collaboratorId, String roomId) {
        if (collaboratorId.equals(this.id)) return; // Don't add self
        
        // Check if collaborator already exists
        RecentCollaborator existing = recentCollaborators.stream()
                .filter(c -> c.getUserId().equals(collaboratorId))
                .findFirst()
                .orElse(null);
        
        if (existing != null) {
            existing.setLastSeenAt(Instant.now());
            existing.setLastRoomId(roomId);
            existing.incrementMeetCount();
        } else {
            recentCollaborators.add(new RecentCollaborator(collaboratorId, roomId));
        }
        
        // Sort by lastSeenAt descending and keep only top 20
        recentCollaborators.sort((a, b) -> b.getLastSeenAt().compareTo(a.getLastSeenAt()));
        if (recentCollaborators.size() > 20) {
            recentCollaborators = new ArrayList<>(recentCollaborators.subList(0, 20));
        }
    }

    /**
     * Embedded document for tracking recent collaborators
     */
    public static class RecentCollaborator {
        private String userId;
        private String lastRoomId;
        private Instant lastSeenAt;
        private int meetCount;

        public RecentCollaborator() {}

        public RecentCollaborator(String userId, String roomId) {
            this.userId = userId;
            this.lastRoomId = roomId;
            this.lastSeenAt = Instant.now();
            this.meetCount = 1;
        }

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public String getLastRoomId() { return lastRoomId; }
        public void setLastRoomId(String lastRoomId) { this.lastRoomId = lastRoomId; }

        public Instant getLastSeenAt() { return lastSeenAt; }
        public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }

        public int getMeetCount() { return meetCount; }
        public void setMeetCount(int meetCount) { this.meetCount = meetCount; }
        public void incrementMeetCount() { this.meetCount++; }
    }
}
