package com.spatialmeet.service;

import com.spatialmeet.dto.DashboardSummary;
import com.spatialmeet.dto.PublicProfile;
import com.spatialmeet.dto.UserResponse;
import com.spatialmeet.model.AvatarPreferences;
import com.spatialmeet.model.User;
import com.spatialmeet.model.UserStatus;
import com.spatialmeet.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

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

    public DashboardSummary getDashboardSummary(User user) {
        // Get counts
        int createdRoomsCount = user.getCreatedRooms() != null ? user.getCreatedRooms().size() : 0;
        int joinedRoomsCount = user.getJoinedRooms() != null ? user.getJoinedRooms().size() : 0;

        // Get recent collaborators - resolve user details
        List<DashboardSummary.CollaboratorInfo> collaborators = new ArrayList<>();
        
        if (user.getRecentCollaborators() != null && !user.getRecentCollaborators().isEmpty()) {
            // Get collaborator user IDs (already sorted by lastSeenAt in User model)
            List<String> collaboratorIds = user.getRecentCollaborators().stream()
                    .map(User.RecentCollaborator::getUserId)
                    .limit(10) // Limit to 10 for dashboard
                    .collect(Collectors.toList());
            
            // Batch fetch collaborator details
            List<User> collaboratorUsers = userRepository.findAllById(collaboratorIds);
            
            // Create a map for quick lookup
            var userMap = collaboratorUsers.stream()
                    .collect(Collectors.toMap(User::getId, u -> u));
            
            // Build collaborator info in order, preserving the sort order
            for (String collabId : collaboratorIds) {
                User collabUser = userMap.get(collabId);
                if (collabUser != null) {
                    String characterName = collabUser.getAvatarPreferences() != null 
                            ? collabUser.getAvatarPreferences().getCharacterName() 
                            : "Adam";
                    collaborators.add(new DashboardSummary.CollaboratorInfo(
                            collabUser.getId(),
                            collabUser.getUsername(),
                            collabUser.getDisplayName(),
                            characterName
                    ));
                }
            }
        }

        return new DashboardSummary(
            user.getDisplayName(),
            user.getUsername(),
            user.getAvatarPreferences(),
            createdRoomsCount,
            joinedRoomsCount,
            collaborators
        );
    }

    /**
     * Update collaborators for a user when they meet other users in a room.
     * Called when a user joins a room with other participants.
     */
    public void updateCollaborators(String userId, List<String> otherUserIds, String roomId) {
        if (otherUserIds == null || otherUserIds.isEmpty()) return;
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return;
        
        User user = userOpt.get();
        for (String otherUserId : otherUserIds) {
            if (!otherUserId.equals(userId)) {
                user.addCollaborator(otherUserId, roomId);
            }
        }
        userRepository.save(user);
    }

    /**
     * Bidirectionally update collaborators for all users in a room.
     * Call this when a new user joins a room.
     */
    public void recordRoomCollaboration(String newUserId, List<String> existingUserIds, String roomId) {
        if (existingUserIds == null || existingUserIds.isEmpty()) return;
        
        // Update the new user's collaborators with existing users
        updateCollaborators(newUserId, existingUserIds, roomId);
        
        // Update each existing user's collaborators with the new user
        List<String> newUserList = List.of(newUserId);
        for (String existingUserId : existingUserIds) {
            updateCollaborators(existingUserId, newUserList, roomId);
        }
    }

    /**
     * Get a public-facing profile for any user by user ID.
     * This is accessible to all users, including guests.
     */
    public PublicProfile getPublicProfileById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get counts
        int createdRoomsCount = user.getCreatedRooms() != null ? user.getCreatedRooms().size() : 0;
        int joinedRoomsCount = user.getJoinedRooms() != null ? user.getJoinedRooms().size() : 0;

        // Get recent collaborators
        List<PublicProfile.CollaboratorInfo> collaborators = new ArrayList<>();
        if (user.getRecentCollaborators() != null && !user.getRecentCollaborators().isEmpty()) {
            List<String> collaboratorIds = user.getRecentCollaborators().stream()
                    .map(User.RecentCollaborator::getUserId)
                    .limit(10)
                    .collect(Collectors.toList());
            
            List<User> collaboratorUsers = userRepository.findAllById(collaboratorIds);
            var userMap = collaboratorUsers.stream()
                    .collect(Collectors.toMap(User::getId, u -> u));
            
            for (String collabId : collaboratorIds) {
                User collabUser = userMap.get(collabId);
                if (collabUser != null) {
                    String characterName = collabUser.getAvatarPreferences() != null 
                            ? collabUser.getAvatarPreferences().getCharacterName() 
                            : "Adam";
                    collaborators.add(new PublicProfile.CollaboratorInfo(
                            collabUser.getId(),
                            collabUser.getUsername(),
                            collabUser.getDisplayName(),
                            characterName
                    ));
                }
            }
        }

        // For now, return empty list for public rooms
        // You could implement logic to show only public/non-private rooms
        List<PublicProfile.PublicRoomInfo> publicRooms = new ArrayList<>();

        return new PublicProfile(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.isGuest(),
            user.getAvatarPreferences(),
            user.getCreatedAt().toString(),
            createdRoomsCount,
            joinedRoomsCount,
            collaborators,
            publicRooms
        );
    }
}

