package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.SystemSetting;
import com.ieee.evaluator.repository.SystemSettingRepository;
import com.ieee.evaluator.service.DynamicConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "http://localhost:5173") // Crucial for React!
public class SettingsController {

    private final SystemSettingRepository repository;
    private final DynamicConfigService configService;

    public SettingsController(SystemSettingRepository repository, DynamicConfigService configService) {
        this.repository = repository;
        this.configService = configService;
    }

    @GetMapping
    public ResponseEntity<List<SystemSetting>> getAllSettings() {
        return ResponseEntity.ok(repository.findAll());
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
}