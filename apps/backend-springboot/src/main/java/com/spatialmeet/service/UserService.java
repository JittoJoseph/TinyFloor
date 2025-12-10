package com.spatialmeet.service;

import com.spatialmeet.dto.UserResponse;
import com.spatialmeet.model.AvatarPreferences;
import com.spatialmeet.model.User;
import com.spatialmeet.model.UserStatus;
import com.spatialmeet.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> findById(String id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public UserResponse getUserProfile(String userId) {
        return userRepository.findById(userId)
                .map(UserResponse::new)
                .orElse(null);
    }

    public UserResponse updateProfile(String userId, String displayName, AvatarPreferences avatarPreferences) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return null;
        }
        
        User user = userOpt.get();
        if (displayName != null && !displayName.isEmpty()) {
            user.setDisplayName(displayName);
        }
        if (avatarPreferences != null) {
            user.setAvatarPreferences(avatarPreferences);
        }
        user.setLastActiveAt(Instant.now());
        
        User savedUser = userRepository.save(user);
        return new UserResponse(savedUser);
    }

    public UserResponse updateAvatar(String userId, AvatarPreferences avatarPreferences) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return null;
        }
        
        User user = userOpt.get();
        user.setAvatarPreferences(avatarPreferences);
        user.setLastActiveAt(Instant.now());
        
        User savedUser = userRepository.save(user);
        return new UserResponse(savedUser);
    }

    public void updateStatus(String userId, UserStatus status) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setStatus(status);
            user.setLastActiveAt(Instant.now());
            userRepository.save(user);
        }
    }

    public void addCreatedRoom(String userId, String roomId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.addCreatedRoom(roomId);
            userRepository.save(user);
        }
    }

    public void addJoinedRoom(String userId, String roomId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.addJoinedRoom(roomId);
            userRepository.save(user);
        }
    }

    // Cleanup old guest accounts
    @Scheduled(fixedRate = 86400000) // Run daily
    public void cleanupOldGuests() {
        Instant threshold = Instant.now().minusSeconds(7 * 24 * 60 * 60); // 7 days
        List<User> oldGuests = userRepository.findByIsGuestTrueAndLastActiveAtBefore(threshold);
        for (User guest : oldGuests) {
            userRepository.delete(guest);
        }
    }
}
