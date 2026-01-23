package com.spatialmeet.service;

import com.spatialmeet.dto.AuthRequest;
import com.spatialmeet.dto.AuthResponse;
import com.spatialmeet.model.AvatarPreferences;
import com.spatialmeet.model.User;
import com.spatialmeet.model.UserStatus;
import com.spatialmeet.repository.UserRepository;
import com.spatialmeet.security.JwtUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    public AuthResponse register(AuthRequest request) {
        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            AuthResponse error = new AuthResponse();
            error.setMessage("Username already exists");
            return error;
        }

        // Check if email already exists
        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            AuthResponse error = new AuthResponse();
            error.setMessage("Email already exists");
            return error;
        }

        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setDisplayName(request.getDisplayName() != null ? request.getDisplayName() : request.getUsername());
        user.setGuest(false);
        user.setStatus(UserStatus.AVAILABLE);
        user.setAvatarPreferences(new AvatarPreferences("Adam"));

        User savedUser = userRepository.save(user);

        // Generate JWT token
        String token = jwtUtils.generateToken(savedUser.getId(), savedUser.getUsername(), false);

        return new AuthResponse(token, savedUser);
    }

    public AuthResponse login(AuthRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        
        if (userOpt.isEmpty()) {
            AuthResponse error = new AuthResponse();
            error.setMessage("Invalid username or password");
            return error;
        }

        User user = userOpt.get();
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            AuthResponse error = new AuthResponse();
            error.setMessage("Invalid username or password");
            return error;
        }

        // Update status
        user.setStatus(UserStatus.AVAILABLE);
        userRepository.save(user);

        // Generate JWT token
        String token = jwtUtils.generateToken(user.getId(), user.getUsername(), false);

        return new AuthResponse(token, user);
    }

    public AuthResponse createGuestSession(String displayName, String character) {
        // Create guest user
        String guestId = "guest_" + UUID.randomUUID().toString().substring(0, 8);
        
        User guest = new User();
        guest.setUsername(guestId);
        guest.setDisplayName(displayName != null ? displayName : "Guest");
        guest.setGuest(true);
        guest.setStatus(UserStatus.AVAILABLE);
        guest.setAvatarPreferences(new AvatarPreferences(character != null ? character : "Adam"));

        User savedGuest = userRepository.save(guest);

        // Generate JWT token for guest
        String token = jwtUtils.generateToken(savedGuest.getId(), savedGuest.getUsername(), true);

        return new AuthResponse(token, savedGuest);
    }

    public void logout(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setStatus(UserStatus.OFFLINE);
            userRepository.save(user);
        }
    }

    public boolean validateToken(String token) {
        return jwtUtils.validateToken(token);
    }

    public String getUserIdFromToken(String token) {
        return jwtUtils.getUserIdFromToken(token);
    }

    public User getUserById(String userId) {
        return userRepository.findById(userId).orElse(null);
    }
}
