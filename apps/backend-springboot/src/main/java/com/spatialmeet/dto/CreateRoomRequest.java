package com.spatialmeet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public class CreateRoomRequest {
    
    @NotBlank(message = "Room name is required")
    @Size(min = 1, max = 50, message = "Room name must be between 1 and 50 characters")
    private String name;
    
    private boolean isPublic = true;
    
    @Size(min = 4, max = 50, message = "Password must be between 4 and 50 characters")
    private String password;
    
    @Min(value = 2, message = "Max players must be at least 2")
    @Max(value = 50, message = "Max players cannot exceed 50")
    private int maxPlayers = 20;
    
    private RoomSettingsDto settings;

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isPublic() { return isPublic; }
    public void setPublic(boolean isPublic) { this.isPublic = isPublic; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public int getMaxPlayers() { return maxPlayers; }
    public void setMaxPlayers(int maxPlayers) { this.maxPlayers = maxPlayers; }

    public RoomSettingsDto getSettings() { return settings; }
    public void setSettings(RoomSettingsDto settings) { this.settings = settings; }
}
