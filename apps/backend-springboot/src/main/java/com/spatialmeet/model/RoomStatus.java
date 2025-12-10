package com.spatialmeet.model;

public enum RoomStatus {
    ACTIVE,      // Room is active with players online
    INACTIVE,    // Room exists but no players currently
    ARCHIVED,    // Room is archived (soft delete)
    DELETED      // Room marked for deletion
}
