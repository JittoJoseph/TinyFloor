package com.spatialmeet.model;

public class Player {
    // Tile-based movement constants
    public static final int TILE_SIZE = 32;
    public static final int MAP_WIDTH_TILES = 55;   // 1760 / 32
    public static final int MAP_HEIGHT_TILES = 25;  // 800 / 32
    
    private String id;
    private String name;
    private String sprite;
    private int tileX;  // Tile coordinate (not pixels)
    private int tileY;  // Tile coordinate (not pixels)
    private String direction = "down";
    private long lastSeen;
    private String inCallWith;

    // Constructors, getters, setters
    public Player() {}

    public Player(String id, String name, int tileX, int tileY) {
        this.id = id;
        this.name = name;
        this.tileX = tileX;
        this.tileY = tileY;
        this.lastSeen = System.currentTimeMillis();
    }
    
    public int getPixelX() { return tileX * TILE_SIZE + TILE_SIZE / 2; }
    public int getPixelY() { return tileY * TILE_SIZE + TILE_SIZE / 2; }
    
    public static boolean isValidTile(int tx, int ty) {
        return tx >= 1 && tx < MAP_WIDTH_TILES - 1 && ty >= 1 && ty < MAP_HEIGHT_TILES - 1;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSprite() { return sprite; }
    public void setSprite(String sprite) { this.sprite = sprite; }

    public int getTileX() { return tileX; }
    public void setTileX(int tileX) { this.tileX = tileX; }

    public int getTileY() { return tileY; }
    public void setTileY(int tileY) { this.tileY = tileY; }

    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }

    public long getLastSeen() { return lastSeen; }
    public void setLastSeen(long lastSeen) { this.lastSeen = lastSeen; }

    public String getInCallWith() { return inCallWith; }
    public void setInCallWith(String inCallWith) { this.inCallWith = inCallWith; }
}