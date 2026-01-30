package com.spatialmeet.controller;

import com.spatialmeet.dto.UserResponse;
import com.spatialmeet.dto.DashboardSummary;
import com.spatialmeet.dto.PublicProfile;
import com.spatialmeet.model.AvatarPreferences;
import com.spatialmeet.model.User;
import com.spatialmeet.model.UserStatus;
import com.spatialmeet.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(new UserResponse(user));
    }

    @GetMapping("/me/summary")
    public ResponseEntity<DashboardSummary> getDashboardSummary(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userService.getDashboardSummary(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String displayName,
            @RequestBody(required = false) AvatarPreferences avatarPreferences) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserResponse response = userService.updateProfile(user.getId(), displayName, avatarPreferences);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/avatar")
    public ResponseEntity<UserResponse> updateAvatar(
            @AuthenticationPrincipal User user,
            @RequestBody AvatarPreferences avatarPreferences) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserResponse response = userService.updateAvatar(user.getId(), avatarPreferences);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<PublicProfile> getPublicProfile(@PathVariable String userId) {
        try {
            PublicProfile profile = userService.getPublicProfileById(userId);
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
