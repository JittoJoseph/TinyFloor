package com.spatialmeet.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "whiteboards")
public class Whiteboard {

    @Id
    private String roomId;

    private List<Stroke> strokes = new ArrayList<>();

    private Instant updatedAt = Instant.now();

    public Whiteboard() {}

    public Whiteboard(String roomId) {
        this.roomId = roomId;
    }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public List<Stroke> getStrokes() { return strokes; }
    public void setStrokes(List<Stroke> strokes) { this.strokes = strokes; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static class Stroke {
        private String id;
        private String color;
        private double size;
        private boolean erase;
        private List<Double> points = new ArrayList<>();

        public Stroke() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }

        public double getSize() { return size; }
        public void setSize(double size) { this.size = size; }

        public boolean isErase() { return erase; }
        public void setErase(boolean erase) { this.erase = erase; }

        public List<Double> getPoints() { return points; }
        public void setPoints(List<Double> points) { this.points = points; }
    }
}
