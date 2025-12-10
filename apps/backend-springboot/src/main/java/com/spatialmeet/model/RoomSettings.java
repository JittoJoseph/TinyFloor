package com.spatialmeet.model;

public class RoomSettings {
    private boolean allowGuests = true;
    private boolean requireApproval = false;
    private boolean enableVideo = true;
    private boolean enableAudio = true;
    private boolean enableChat = true;
    private String welcomeMessage;
    private String mapTheme = "office";
    private int proximityRadius = 2; // In tiles

    // Constructors
    public RoomSettings() {}

    // Getters and Setters
    public boolean isAllowGuests() { return allowGuests; }
    public void setAllowGuests(boolean allowGuests) { this.allowGuests = allowGuests; }

    public boolean isRequireApproval() { return requireApproval; }
    public void setRequireApproval(boolean requireApproval) { this.requireApproval = requireApproval; }

    public boolean isEnableVideo() { return enableVideo; }
    public void setEnableVideo(boolean enableVideo) { this.enableVideo = enableVideo; }

    public boolean isEnableAudio() { return enableAudio; }
    public void setEnableAudio(boolean enableAudio) { this.enableAudio = enableAudio; }

    public boolean isEnableChat() { return enableChat; }
    public void setEnableChat(boolean enableChat) { this.enableChat = enableChat; }

    public String getWelcomeMessage() { return welcomeMessage; }
    public void setWelcomeMessage(String welcomeMessage) { this.welcomeMessage = welcomeMessage; }

    public String getMapTheme() { return mapTheme; }
    public void setMapTheme(String mapTheme) { this.mapTheme = mapTheme; }

    public int getProximityRadius() { return proximityRadius; }
    public void setProximityRadius(int proximityRadius) { this.proximityRadius = proximityRadius; }
}
