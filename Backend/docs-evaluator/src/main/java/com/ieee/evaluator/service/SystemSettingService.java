package com.ieee.evaluator.service;

import com.ieee.evaluator.model.SystemSetting;
import com.ieee.evaluator.repository.SystemSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class SystemSettingService {

    public static final String ACTIVE_AI_PROVIDER = "ACTIVE_AI_PROVIDER";
    public static final String OPENAI_MODEL = "OPENAI_MODEL";
    public static final String OPENAI_API_KEY = "OPENAI_API_KEY";

    public static final Set<String> AI_ALLOWED_UPDATE_KEYS = Set.of(
        ACTIVE_AI_PROVIDER,
        OPENAI_MODEL,
        OPENAI_API_KEY
    );

    private static final Set<String> SENSITIVE_KEYS = Set.of(
        OPENAI_API_KEY
    );

    private final SystemSettingRepository repository;
    private final AiSettingsValidationService validationService;

    public SystemSettingService(
        SystemSettingRepository repository,
        AiSettingsValidationService validationService
    ) {
        this.repository = repository;
        this.validationService = validationService;
    }

    @Transactional(readOnly = true)
    public List<SystemSetting> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public String getValueOrNull(String key) {
        return repository.findById(key).map(SystemSetting::getValue).orElse(null);
    }

    @Transactional(readOnly = true)
    public String getRequiredValue(String key) {
        return repository.findById(key)
            .map(SystemSetting::getValue)
            .orElseThrow(() -> new IllegalStateException("Missing system setting: " + key));
    }

    @Transactional(readOnly = true)
    public boolean hasStoredApiKey(String key) {
        String value = repository.findById(key).map(SystemSetting::getValue).orElse(null);
        return value != null && !value.isBlank();
    }

    @Transactional
    public void upsertAnySetting(String key, String value) {
        SystemSetting setting = repository.findById(key).orElseGet(() -> {
            SystemSetting created = new SystemSetting();
            created.setKey(key);
            created.setCategory("GENERAL");
            created.setDescription("System setting");
            return created;
        });

        if (setting.getCategory() == null || setting.getCategory().isBlank()) {
            setting.setCategory("GENERAL");
        }
        setting.setValue(value == null ? "" : value);
        repository.save(setting);
    }

    @Transactional
    public BatchUpdateResult updateMultipleAiSettings(Map<String, String> updates) {
        List<String> saved = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<String> rejected = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        Map<String, String> candidateUpserts = new LinkedHashMap<>();
        Map<String, String> effectiveValues = new LinkedHashMap<>();

        for (String key : AI_ALLOWED_UPDATE_KEYS) {
            String existing = repository.findById(key).map(SystemSetting::getValue).orElse("");
            effectiveValues.put(key, trimOrEmpty(existing));
        }

        for (Map.Entry<String, String> entry : updates.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            boolean isAllowed = AI_ALLOWED_UPDATE_KEYS.contains(key);
            boolean shouldSkipSensitiveBlank = isSensitiveKey(key) && (value == null || value.isBlank());

            if (!isAllowed) {
                rejected.add(key);
            } else if (shouldSkipSensitiveBlank) {
                skipped.add(key);
            } else {
                String normalized = value == null ? "" : value.trim();
                candidateUpserts.put(key, normalized);
                effectiveValues.put(key, normalized);
            }
        }

        errors.addAll(validationService.validateEffectiveSettings(
            effectiveValues.get(ACTIVE_AI_PROVIDER),
            effectiveValues.get(OPENAI_API_KEY),
            effectiveValues.get(OPENAI_MODEL)
        ));

        if (!errors.isEmpty()) {
            return new BatchUpdateResult(saved, skipped, rejected, errors);
        }

        for (Map.Entry<String, String> upsert : candidateUpserts.entrySet()) {
            try {
                saveAiSettingInternal(upsert.getKey(), upsert.getValue());
                saved.add(upsert.getKey());
            } catch (Exception e) {
                errors.add(upsert.getKey() + ": " + e.getMessage());
            }
        }

        return new BatchUpdateResult(saved, skipped, rejected, errors);
    }

    @Transactional
    public void upsertAiSetting(String key, String value) {
        if (!AI_ALLOWED_UPDATE_KEYS.contains(key)) {
            throw new IllegalArgumentException("Disallowed AI setting key: " + key);
        }

        saveAiSettingInternal(key, value == null ? "" : value);
    }

    private void saveAiSettingInternal(String key, String value) {

        SystemSetting setting = repository.findById(key).orElseGet(() -> {
            SystemSetting created = new SystemSetting();
            created.setKey(key);
            created.setCategory("AI");
            created.setDescription(defaultDescriptionFor(key));
            return created;
        });

        if (setting.getCategory() == null || setting.getCategory().isBlank()) {
            setting.setCategory("AI");
        }
        if (setting.getDescription() == null || setting.getDescription().isBlank()) {
            setting.setDescription(defaultDescriptionFor(key));
        }

        setting.setValue(value);
        repository.save(setting);
    }

    private boolean isSensitiveKey(String key) {
        return SENSITIVE_KEYS.contains(key);
    }

    private String defaultDescriptionFor(String key) {
        return switch (key.toUpperCase(Locale.ROOT)) {
            case ACTIVE_AI_PROVIDER -> "Active provider used for AI analysis";
            case OPENAI_MODEL -> "Active OpenAI model";
            case OPENAI_API_KEY -> "OpenAI API key";
            default -> "AI setting";
        };
    }

    private String trimOrEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    public record BatchUpdateResult(
        List<String> saved,
        List<String> skipped,
        List<String> rejected,
        List<String> errors
    ) {
        public Map<String, Object> toResponseBody() {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("saved", saved);
            body.put("skipped", skipped);
            body.put("rejected", rejected);
            if (!errors.isEmpty()) {
                body.put("errors", errors);
            }
            body.put("message", errors.isEmpty()
                ? "Settings updated successfully."
                : "Some settings could not be saved. See 'errors' for details.");
            return body;
        }

        public boolean hasErrors() {
            return !errors.isEmpty();
        }
    }
}