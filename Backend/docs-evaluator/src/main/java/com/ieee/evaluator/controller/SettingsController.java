package com.ieee.evaluator.controller;

import com.ieee.evaluator.service.AiProviderRuntimeService;
import com.ieee.evaluator.service.SystemSettingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST controller for system settings management.
 *
 * Endpoints:
 *   GET  /api/settings                  – list all settings (API keys masked)
 *   POST /api/settings/update           – update a single key (legacy / kept for compatibility)
 *   POST /api/settings/update-multiple  – UPSERT a batch of settings (primary endpoint)
 */
@RestController
@RequestMapping("/api/settings")
@Slf4j
public class SettingsController {

    // ── Keys whose values are never echoed back to the client ─────────────────
    private static final Set<String> SENSITIVE_KEYWORDS = Set.of(
        "API_KEY", "SECRET", "PASSWORD", "TOKEN", "PRIVATE_KEY", "SERVICE_ACCOUNT"
    );

    private final SystemSettingService settingsService;
    private final AiProviderRuntimeService aiProviderRuntimeService;

    public SettingsController(
        SystemSettingService settingsService,
        AiProviderRuntimeService aiProviderRuntimeService
    ) {
        this.settingsService = settingsService;
        this.aiProviderRuntimeService = aiProviderRuntimeService;
    }

    // ── GET /api/settings ─────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<SettingResponse>> getAllSettings() {
        List<SettingResponse> settings = settingsService.findAll().stream()
            .map(s -> new SettingResponse(
                s.getKey(),
                maskIfSensitive(s.getKey(), s.getValue()),
                s.getCategory(),
                s.getDescription(),
                s.getUpdatedAt()
            ))
            .toList();
        return ResponseEntity.ok(settings);
    }

    // ── POST /api/settings/update  (single-key, legacy) ──────────────────────

    @PostMapping("/update")
    public ResponseEntity<Map<String, String>> updateSetting(@RequestBody Map<String, String> payload) {
        String key   = payload.get("key");
        String value = payload.get("value");

        if (key == null || key.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Setting key is required."));
        }

        try {
            // If value is blank AND this is a sensitive key → preserve existing value
            if (isSensitiveKey(key) && (value == null || value.isBlank())) {
                log.info("Skipping blank update for sensitive key '{}'", key);
                return ResponseEntity.ok(Map.of("message", "No change applied (empty value for sensitive key)."));
            }
            settingsService.upsertAnySetting(key, value);
            return ResponseEntity.ok(Map.of("message", "Setting updated successfully."));
        } catch (Exception e) {
            log.error("Failed to update setting '{}': {}", key, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Update failed: " + e.getMessage()));
        }
    }

    // ── POST /api/settings/update-multiple  (batch UPSERT) ───────────────────

    /**
     * Accept a JSON object of { key: value } pairs.
     *
     * Rules:
     *   • Only keys in ALLOWED_KEYS are processed; others are rejected.
     *   • If a sensitive key has an empty/blank new value → skip (preserve existing).
     *   • Non-sensitive keys with blank values → overwrite (explicit clear).
     *
     * Returns a summary of what was saved vs skipped.
     */
    @PostMapping("/update-multiple")
    public ResponseEntity<Map<String, Object>> updateMultipleSettings(@RequestBody Map<String, String> payload) {
        SystemSettingService.BatchUpdateResult result = settingsService.updateMultipleAiSettings(payload);
        return result.hasErrors()
            ? ResponseEntity.badRequest().body(result.toResponseBody())
            : ResponseEntity.ok(result.toResponseBody());
    }

    @GetMapping("/ai-runtime")
    public ResponseEntity<AiProviderRuntimeService.AiRuntimeResponse> getAiRuntimeSettings() {
        return ResponseEntity.ok(aiProviderRuntimeService.getAiRuntime());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String maskIfSensitive(String key, String value) {
        if (!isSensitiveKey(key) || value == null || value.isBlank()) return value;
        return "••••••••";   // 8 bullets — indicates "key exists but is hidden"
    }

    private boolean isSensitiveKey(String key) {
        if (key == null || key.isBlank()) return false;
        String upper = key.toUpperCase(Locale.ROOT);
        return SENSITIVE_KEYWORDS.stream().anyMatch(upper::contains);
    }

    // ── Response DTO ──────────────────────────────────────────────────────────

    public record SettingResponse(
        String key,
        String value,
        String category,
        String description,
        java.time.LocalDateTime updatedAt
    ) {}
}