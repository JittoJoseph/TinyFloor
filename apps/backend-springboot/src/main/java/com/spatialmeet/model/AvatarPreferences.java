package com.spatialmeet.model;

public class AvatarPreferences {
    private String characterName = "Adam";
    private String skinTone;
    private String hairStyle;
    private String hairColor;
    private String outfit;
    private String accessories;

    // Constructors
    public AvatarPreferences() {}

    public AvatarPreferences(String characterName) {
        this.characterName = characterName;
    }

    // Getters and Setters
    public String getCharacterName() { return characterName; }
    public void setCharacterName(String characterName) { this.characterName = characterName; }

    public String getSkinTone() { return skinTone; }
    public void setSkinTone(String skinTone) { this.skinTone = skinTone; }

    public String getHairStyle() { return hairStyle; }
    public void setHairStyle(String hairStyle) { this.hairStyle = hairStyle; }

    public String getHairColor() { return hairColor; }
    public void setHairColor(String hairColor) { this.hairColor = hairColor; }

    public String getOutfit() { return outfit; }
    public void setOutfit(String outfit) { this.outfit = outfit; }

    public String getAccessories() { return accessories; }
    public void setAccessories(String accessories) { this.accessories = accessories; }
}
