package com.spatialmeet.model;

public class AvatarPreferences {
    private String characterName = "Adam";

    // Constructors
    public AvatarPreferences() {}

    public AvatarPreferences(String characterName) {
        this.characterName = characterName;
    }

    // Getters and Setters
    public String getCharacterName() { return characterName; }
    public void setCharacterName(String characterName) { this.characterName = characterName; }
}
