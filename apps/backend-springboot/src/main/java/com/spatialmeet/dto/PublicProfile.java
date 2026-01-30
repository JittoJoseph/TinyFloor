package com.spatialmeet.dto;

import com.spatialmeet.model.AvatarPreferences;
import java.util.List;

public class PublicProfile {
    private String id;
    private String username;
    private String displayName;
    private boolean isGuest;
    private AvatarPreferences avatarPreferences;
    private String createdAt;
    private int createdRoomsCount;
    private int joinedRoomsCount;
    private List<CollaboratorInfo> recentCollaborators;
    private List<PublicRoomInfo> publicRooms;

    public PublicProfile() {}

    public PublicProfile(String id, String username, String displayName, boolean isGuest,
                         AvatarPreferences avatarPreferences, String createdAt,
                         int createdRoomsCount, int joinedRoomsCount,
                         List<CollaboratorInfo> recentCollaborators,
                         List<PublicRoomInfo> publicRooms) {
        this.id = id;
        this.username = username;
        this.displayName = displayName;
        this.isGuest = isGuest;
        this.avatarPreferences = avatarPreferences;
        this.createdAt = createdAt;
        this.createdRoomsCount = createdRoomsCount;
        this.joinedRoomsCount = joinedRoomsCount;
        this.recentCollaborators = recentCollaborators;
        this.publicRooms = publicRooms;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public boolean isGuest() { return isGuest; }
    public void setGuest(boolean guest) { isGuest = guest; }

    public AvatarPreferences getAvatarPreferences() { return avatarPreferences; }
    public void setAvatarPreferences(AvatarPreferences avatarPreferences) { this.avatarPreferences = avatarPreferences; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public int getCreatedRoomsCount() { return createdRoomsCount; }
    public void setCreatedRoomsCount(int createdRoomsCount) { this.createdRoomsCount = createdRoomsCount; }

    public int getJoinedRoomsCount() { return joinedRoomsCount; }
    public void setJoinedRoomsCount(int joinedRoomsCount) { this.joinedRoomsCount = joinedRoomsCount; }

    public List<CollaboratorInfo> getRecentCollaborators() { return recentCollaborators; }
    public void setRecentCollaborators(List<CollaboratorInfo> recentCollaborators) { this.recentCollaborators = recentCollaborators; }

    public List<PublicRoomInfo> getPublicRooms() { return publicRooms; }
    public void setPublicRooms(List<PublicRoomInfo> publicRooms) { this.publicRooms = publicRooms; }

    public static class CollaboratorInfo {
        private String id;
        private String username;
        private String displayName;
        private String characterName;

        public CollaboratorInfo() {}

        public CollaboratorInfo(String id, String username, String displayName, String characterName) {
            this.id = id;
            this.username = username;
            this.displayName = displayName;
            this.characterName = characterName;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }

        public String getCharacterName() { return characterName; }
        public void setCharacterName(String characterName) { this.characterName = characterName; }
    }

    public static class PublicRoomInfo {
        private String id;
        private String name;
        private int playerCount;
        private String createdAt;
        private String lastActivityAt;

        public PublicRoomInfo() {}

        public PublicRoomInfo(String id, String name, int playerCount, String createdAt, String lastActivityAt) {
            this.id = id;
            this.name = name;
            this.playerCount = playerCount;
            this.createdAt = createdAt;
            this.lastActivityAt = lastActivityAt;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public int getPlayerCount() { return playerCount; }
        public void setPlayerCount(int playerCount) { this.playerCount = playerCount; }

        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

        public String getLastActivityAt() { return lastActivityAt; }
        public void setLastActivityAt(String lastActivityAt) { this.lastActivityAt = lastActivityAt; }
    }
}
