package com.spatialmeet.repository;

import com.spatialmeet.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
    
    List<User> findByIsGuestTrueAndLastActiveAtBefore(Instant threshold);
    
    List<User> findByCreatedRoomsContaining(String roomId);
    
    List<User> findByJoinedRoomsContaining(String roomId);
}
