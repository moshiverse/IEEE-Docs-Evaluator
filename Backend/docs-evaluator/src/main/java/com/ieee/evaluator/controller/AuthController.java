package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.StudentTrackerRecord;
import com.ieee.evaluator.service.AuthAllowlistService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthAllowlistService allowlistService;

    public AuthController(AuthAllowlistService allowlistService) {
        this.allowlistService = allowlistService;
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyGoogleLogin(@RequestBody Map<String, String> payload) {
        try {
            // Only extract and use the email
            String googleEmail = payload.get("email"); 
            
            StudentTrackerRecord verifiedStudent = allowlistService.verifyUser(googleEmail);

            if (verifiedStudent != null) {
                return ResponseEntity.ok(verifiedStudent); 
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Unauthorized: You are not on the Class Allowlist.");
            }
        } catch (Exception e) { 
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error connecting to verification server: " + e.getMessage());
        }
    }
}