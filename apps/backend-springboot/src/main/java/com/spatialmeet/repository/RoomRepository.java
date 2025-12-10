package com.spatialmeet.repository;

import com.spatialmeet.model.Room;
import com.spatialmeet.model.RoomStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends MongoRepository<Room, String> {
    
    // Find public active rooms
    List<Room> findByIsPublicTrueAndStatusOrderByLastActivityAtDesc(RoomStatus status);
    
    Page<Room> findByIsPublicTrueAndStatusOrderByLastActivityAtDesc(RoomStatus status, Pageable pageable);
    
    // Find rooms by owner
    List<Room> findByOwnerId(String ownerId);
    
    // Find room by share code
    Optional<Room> findByShareCode(String shareCode);
    
    // Find inactive rooms for cleanup
    List<Room> findByLastActivityAtBeforeAndStatus(Instant threshold, RoomStatus status);
    
    // Search rooms by name
    @Query("{ 'name': { $regex: ?0, $options: 'i' }, 'isPublic': true, 'status': 'ACTIVE' }")
    List<Room> searchByName(String namePattern);
    
    // Count active public rooms
    long countByIsPublicTrueAndStatus(RoomStatus status);
    
    // Find rooms with players
    @Query("{ 'users.0': { $exists: true }, 'isPublic': true, 'status': 'ACTIVE' }")
    List<Room> findActiveRoomsWithPlayers();
    
    // Check if room exists and is accessible
    boolean existsByIdAndStatus(String id, RoomStatus status);
}
