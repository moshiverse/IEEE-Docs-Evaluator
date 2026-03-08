package com.ieee.evaluator.service;

import com.ieee.evaluator.model.SystemSetting;
import com.ieee.evaluator.repository.SystemSettingRepository;
import org.springframework.stereotype.Service;

@Service
public class DynamicConfigService {

    private final SystemSettingRepository repository;

    public DynamicConfigService(SystemSettingRepository repository) {
        this.repository = repository;
    }

    /**
     * Fetches a string value directly from the Supabase settings table.
     */
    public String getValue(String key) {
        return repository.findById(key)
                .map(SystemSetting::getValue)
                .orElseThrow(() -> new RuntimeException("Missing configuration key in database: " + key));
    }

    /**
     * Helper method to automatically convert numeric settings (like column numbers) into Integers.
     */
    public int getIntValue(String key) {
        return Integer.parseInt(getValue(key));
    }

    /**
     * Updates an existing setting or creates a new one if it doesn't exist.
     */
    public void updateSetting(String key, String newValue) {
        SystemSetting setting = repository.findById(key)
                .orElse(new SystemSetting());
        setting.setKey(key);
        setting.setValue(newValue);
        repository.save(setting);
    }
}