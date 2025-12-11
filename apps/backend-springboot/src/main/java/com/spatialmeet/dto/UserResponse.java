package com.spatialmeet.dto;

import com.spatialmeet.model.User;
import com.spatialmeet.model.UserStatus;
import com.spatialmeet.model.AvatarPreferences;

import java.time.Instant;
import java.util.List;

public class UserResponse {
    private String id;
    private String username;
    private String displayName;
    private String email;
    private AvatarPreferences avatarPreferences;
    private List<String> createdRooms;
    private List<String> joinedRooms;
    private boolean isGuest;
    private Instant createdAt;
    private UserStatus status;

    // Constructors
    public UserResponse() {}

    public UserResponse(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.displayName = user.getDisplayName();
        this.email = user.getEmail();
        this.avatarPreferences = user.getAvatarPreferences();
        this.createdRooms = user.getCreatedRooms();
        this.joinedRooms = user.getJoinedRooms();
        this.isGuest = user.isGuest();
        this.createdAt = user.getCreatedAt();
        this.status = user.getStatus();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
}
