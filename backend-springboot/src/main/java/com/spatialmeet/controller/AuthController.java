package com.spatialmeet.controller;

import com.spatialmeet.dto.AuthRequest;
import com.spatialmeet.dto.AuthResponse;
import com.spatialmeet.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody AuthRequest request) {
        logger.info("Register request: email={}, username={}", request.getEmail(), request.getUsername());
        AuthResponse response = authService.register(request);
        logger.info("Register response: success={}, message={}", response.getMessage() == null, response.getMessage());
        if (response.getMessage() != null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        if (response.getMessage() != null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/guest")
    public ResponseEntity<AuthResponse> createGuest(
            @RequestParam(required = false) String displayName,
            @RequestParam(required = false) String character) {
        AuthResponse response = authService.createGuestSession(displayName, character);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String userId = authService.getUserIdFromToken(token);
            authService.logout(userId);
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/validate")
    public ResponseEntity<Boolean> validateToken(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return ResponseEntity.ok(authService.validateToken(token));
        }
        return ResponseEntity.ok(false);
    }

    /**
     * Combined validate and get session - reduces 2 API calls to 1.
     * Returns user data if token is valid, null otherwise.
     */
    @GetMapping("/session")
    public ResponseEntity<?> getSession(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.ok(new SessionResponse(false, null));
        }
        
        String token = authHeader.substring(7);
        if (!authService.validateToken(token)) {
            return ResponseEntity.ok(new SessionResponse(false, null));
        }
        
        String userId = authService.getUserIdFromToken(token);
        var user = authService.getUserById(userId);
        if (user == null) {
            return ResponseEntity.ok(new SessionResponse(false, null));
        }
        
        return ResponseEntity.ok(new SessionResponse(true, user));
    }
    
    // Inner class for session response
    public record SessionResponse(boolean valid, Object user) {}
}
