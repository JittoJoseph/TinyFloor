package com.spatialmeet.dto;

import com.spatialmeet.model.AvatarPreferences;
import java.util.List;

public class DashboardSummary {
    private String displayName;
    private String username;
    private AvatarPreferences avatarPreferences;
    private int createdRoomsCount;
    private int joinedRoomsCount;
    private List<CollaboratorInfo> recentCollaborators;

    public DashboardSummary() {}

    public DashboardSummary(String displayName, String username, AvatarPreferences avatarPreferences, 
                           int createdRoomsCount, int joinedRoomsCount, List<CollaboratorInfo> recentCollaborators) {
        this.displayName = displayName;
        this.username = username;
        this.avatarPreferences = avatarPreferences;
        this.createdRoomsCount = createdRoomsCount;
        this.joinedRoomsCount = joinedRoomsCount;
        this.recentCollaborators = recentCollaborators;
    }

    // Getters and Setters
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public AvatarPreferences getAvatarPreferences() { return avatarPreferences; }
    public void setAvatarPreferences(AvatarPreferences avatarPreferences) { this.avatarPreferences = avatarPreferences; }

    public int getCreatedRoomsCount() { return createdRoomsCount; }
    public void setCreatedRoomsCount(int createdRoomsCount) { this.createdRoomsCount = createdRoomsCount; }

    public int getJoinedRoomsCount() { return joinedRoomsCount; }
    public void setJoinedRoomsCount(int joinedRoomsCount) { this.joinedRoomsCount = joinedRoomsCount; }

    public List<CollaboratorInfo> getRecentCollaborators() { return recentCollaborators; }
    public void setRecentCollaborators(List<CollaboratorInfo> recentCollaborators) { this.recentCollaborators = recentCollaborators; }

    // Nested class for collaborator info
    public static class CollaboratorInfo {
        private String id;
        private String displayName;
        private String characterName;

        public CollaboratorInfo() {}

        public CollaboratorInfo(String id, String displayName, String characterName) {
            this.id = id;
            this.displayName = displayName;
            this.characterName = characterName;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getDisplayName() { return displayName; }
        public void setDisplayName(String displayName) { this.displayName = displayName; }

        public String getCharacterName() { return characterName; }
        public void setCharacterName(String characterName) { this.characterName = characterName; }
    }
}
