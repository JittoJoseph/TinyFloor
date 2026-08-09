package com.spatialmeet.service;

import com.spatialmeet.dto.DashboardSummary;
import com.spatialmeet.dto.PublicProfile;
import com.spatialmeet.dto.PublicUserSummary;
import com.spatialmeet.dto.RoomResponse;
import com.spatialmeet.dto.UserResponse;
import com.spatialmeet.model.AvatarPreferences;
import com.spatialmeet.model.Room;
import com.spatialmeet.model.RoomStatus;
import com.spatialmeet.model.User;
import com.spatialmeet.model.UserStatus;
import com.spatialmeet.repository.RoomRepository;
import com.spatialmeet.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    public UserService(UserRepository userRepository, RoomRepository roomRepository) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
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
        List<User> recentCollaborators = getRecentCollaboratorUsers(user, 10);
        List<DashboardSummary.CollaboratorInfo> collaborators = recentCollaborators
                .stream()
                .map(collabUser -> new DashboardSummary.CollaboratorInfo(
                        collabUser.getId(),
                        collabUser.getUsername(),
                        collabUser.getDisplayName(),
                        resolveCharacterName(collabUser)
                ))
                .collect(Collectors.toList());

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
        List<User> recentCollaborators = getRecentCollaboratorUsers(user, 10);
        List<PublicProfile.CollaboratorInfo> collaborators = recentCollaborators
                .stream()
                .map(collabUser -> new PublicProfile.CollaboratorInfo(
                        collabUser.getId(),
                        collabUser.getUsername(),
                        collabUser.getDisplayName(),
                        resolveCharacterName(collabUser)
                ))
                .collect(Collectors.toList());

        List<String> createdRoomIds = user.getCreatedRooms() != null ? user.getCreatedRooms() : List.of();
        List<String> joinedRoomIds = user.getJoinedRooms() != null ? user.getJoinedRooms() : List.of();

        Set<String> allRoomIds = new LinkedHashSet<>();
        allRoomIds.addAll(createdRoomIds);
        allRoomIds.addAll(joinedRoomIds);

        Map<String, RoomResponse> roomMap = roomRepository.findAllById(allRoomIds)
                .stream()
                .filter(room -> room.getStatus() != RoomStatus.DELETED)
                .collect(Collectors.toMap(Room::getId, RoomResponse::new));

        List<RoomResponse> createdRooms = createdRoomIds
                .stream()
                .map(roomMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<RoomResponse> joinedRooms = joinedRoomIds
                .stream()
                .map(roomMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

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
            createdRooms,
            joinedRooms,
            publicRooms
        );
    }

    public List<PublicUserSummary> getPublicUsers(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Page<User> users = userRepository.findAll(
                PageRequest.of(
                        safePage,
                        safeSize,
                        Sort.by(Sort.Order.desc("lastActiveAt"), Sort.Order.desc("createdAt"))
                )
        );

        return users.getContent()
                .stream()
                .map(user -> new PublicUserSummary(
                        user.getId(),
                        user.getUsername(),
                        user.getDisplayName(),
                        resolveCharacterName(user),
                        user.isGuest()
                ))
                .collect(Collectors.toList());
    }

    private List<User> getRecentCollaboratorUsers(User user, int limit) {
        if (user.getRecentCollaborators() == null || user.getRecentCollaborators().isEmpty()) {
            return List.of();
        }

        List<String> collaboratorIds = user.getRecentCollaborators().stream()
                .map(User.RecentCollaborator::getUserId)
                .limit(limit)
                .collect(Collectors.toList());

        return resolveUsersInOrder(collaboratorIds);
    }

    private List<User> resolveUsersInOrder(Collection<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }

        List<User> users = userRepository.findAllById(userIds);
        Map<String, User> userMap = users.stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return userIds.stream()
                .map(userMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private String resolveCharacterName(User user) {
        if (user.getAvatarPreferences() != null && user.getAvatarPreferences().getCharacterName() != null) {
            return user.getAvatarPreferences().getCharacterName();
        }
        return "Adam";
    }
}

