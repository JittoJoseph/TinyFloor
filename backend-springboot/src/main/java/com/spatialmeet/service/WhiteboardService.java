package com.spatialmeet.service;

import com.spatialmeet.model.Whiteboard;
import com.spatialmeet.repository.WhiteboardRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Holds the drawing for every room in memory and writes it back to Mongo on a
 * throttle, so a board is still there when someone walks up to it tomorrow.
 */
@Service
public class WhiteboardService {

    private static final int MAX_STROKES = 400;
    private static final int MAX_POINTS_PER_STROKE = 4000;
    private static final long SAVE_INTERVAL_MS = 4000;

    private final WhiteboardRepository repository;
    private final Map<String, Board> boards = new ConcurrentHashMap<>();

    public WhiteboardService(WhiteboardRepository repository) {
        this.repository = repository;
    }

    private static class Board {
        final Map<String, Whiteboard.Stroke> strokes = new LinkedHashMap<>();
        long lastSavedAt = 0;
        boolean dirty = false;
    }

    private Board load(String roomId) {
        return boards.computeIfAbsent(roomId, id -> {
            Board board = new Board();
            repository.findById(id).ifPresent(saved ->
                    saved.getStrokes().forEach(stroke -> board.strokes.put(stroke.getId(), stroke)));
            return board;
        });
    }

    public List<Whiteboard.Stroke> strokesFor(String roomId) {
        Board board = load(roomId);
        synchronized (board) {
            return new ArrayList<>(board.strokes.values());
        }
    }

    /**
     * Appends the points a client just drew. Strokes arrive in slices while the
     * pen is still moving, so an unknown id starts a stroke and a known one
     * extends it.
     */
    public void append(String roomId, String strokeId, String color, double size, boolean erase, List<Double> points) {
        if (strokeId == null || points == null || points.isEmpty()) return;

        Board board = load(roomId);
        synchronized (board) {
            Whiteboard.Stroke stroke = board.strokes.get(strokeId);
            if (stroke == null) {
                if (board.strokes.size() >= MAX_STROKES) {
                    var oldest = board.strokes.keySet().iterator();
                    if (oldest.hasNext()) {
                        oldest.next();
                        oldest.remove();
                    }
                }
                stroke = new Whiteboard.Stroke();
                stroke.setId(strokeId);
                stroke.setColor(color);
                stroke.setSize(size);
                stroke.setErase(erase);
                board.strokes.put(strokeId, stroke);
            }

            if (stroke.getPoints().size() + points.size() <= MAX_POINTS_PER_STROKE) {
                stroke.getPoints().addAll(points);
            }
            board.dirty = true;
        }

        persist(roomId, board, false);
    }

    public void clear(String roomId) {
        Board board = load(roomId);
        synchronized (board) {
            board.strokes.clear();
            board.dirty = true;
        }
        persist(roomId, board, true);
    }

    private void persist(String roomId, Board board, boolean force) {
        long now = System.currentTimeMillis();
        List<Whiteboard.Stroke> snapshot;

        synchronized (board) {
            if (!board.dirty) return;
            if (!force && now - board.lastSavedAt < SAVE_INTERVAL_MS) return;
            board.lastSavedAt = now;
            board.dirty = false;
            snapshot = new ArrayList<>(board.strokes.values());
        }

        Whiteboard document = new Whiteboard(roomId);
        document.setStrokes(snapshot);
        document.setUpdatedAt(Instant.now());
        repository.save(document);
    }
}
