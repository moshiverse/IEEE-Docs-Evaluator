package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.SystemSetting;
import com.ieee.evaluator.repository.SystemSettingRepository;
import com.ieee.evaluator.service.DynamicConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Locale;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SystemSettingRepository repository;
    private final DynamicConfigService configService;

    public SettingsController(SystemSettingRepository repository, DynamicConfigService configService) {
        this.repository = repository;
        this.configService = configService;
    }

    @GetMapping
    public ResponseEntity<List<SettingResponse>> getAllSettings() {
        List<SettingResponse> settings = repository.findAll().stream()
                .map(setting -> new SettingResponse(
                        setting.getKey(),
                        maskIfSensitive(setting.getKey(), setting.getValue()),
                        setting.getCategory(),
                        setting.getDescription(),
                        setting.getUpdatedAt()
                ))
                .toList();

        return ResponseEntity.ok(settings);
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateSetting(@RequestBody Map<String, String> payload) {
        String key = payload.get("key");
        String value = payload.get("value");
        try {
            configService.updateSetting(key, value);
            return ResponseEntity.ok(Map.of("message", "Setting updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Update failed: " + e.getMessage()));
        }
    }

    private String maskIfSensitive(String key, String value) {
        if (!isSensitiveKey(key) || value == null || value.isBlank()) {
            return value;
        }

        return "********";
    }

    private boolean isSensitiveKey(String key) {
        if (key == null || key.isBlank()) {
            return false;
        }

        String normalized = key.toUpperCase(Locale.ROOT);
        return normalized.contains("API_KEY")
                || normalized.contains("SECRET")
                || normalized.contains("PASSWORD")
                || normalized.contains("TOKEN")
                || normalized.contains("PRIVATE_KEY")
                || normalized.contains("SERVICE_ACCOUNT");
    }

    private record SettingResponse(
            String key,
            String value,
            String category,
            String description,
            java.time.LocalDateTime updatedAt
    ) {}
}