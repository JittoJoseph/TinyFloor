package com.spatialmeet.dto;

public class PublicUserSummary {
    private String id;
    private String username;
    private String displayName;
    private String characterName;
    private boolean isGuest;

    public PublicUserSummary() {}

    public PublicUserSummary(String id, String username, String displayName, String characterName, boolean isGuest) {
        this.id = id;
        this.username = username;
        this.displayName = displayName;
        this.characterName = characterName;
        this.isGuest = isGuest;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getCharacterName() { return characterName; }
    public void setCharacterName(String characterName) { this.characterName = characterName; }

    public boolean isGuest() { return isGuest; }
    public void setGuest(boolean guest) { isGuest = guest; }
}
