package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.ClassContextProfile;
import com.ieee.evaluator.service.ClassContextProfileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/professor")
@Slf4j
public class ClassContextProfileController {

    private final ClassContextProfileService service;

    public ClassContextProfileController(ClassContextProfileService service) {
        this.service = service;
    }

    // ── GET /api/professor/class-context ──────────────────────────────────────

    @GetMapping("/class-context")
    public ResponseEntity<?> get() {
        ClassContextProfile profile = service.find();
        if (profile == null) {
            return ResponseEntity.ok(Map.of("context", ""));
        }
        return ResponseEntity.ok(profile);
    }

    // ── PUT /api/professor/class-context ──────────────────────────────────────

    /**
     * Request body:
     * {
     *   "context": "This is a 3rd year IT class using StarUML and Lucidchart..."
     * }
     *
     * Passing blank or null clears the context.
     */
    @PutMapping("/class-context")
    public ResponseEntity<?> upsert(@RequestBody Map<String, String> payload) {
        try {
            ClassContextProfile saved = service.upsert(payload.get("context"));
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Failed to upsert class context: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to save class context: " + e.getMessage()));
        }
    }
}