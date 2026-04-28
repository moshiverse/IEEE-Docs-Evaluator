package com.ieee.evaluator.service;

import com.ieee.evaluator.model.ClassContextProfile;
import com.ieee.evaluator.repository.ClassContextProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class ClassContextProfileService {

    private static final int SINGLETON_ID = 1;

    private final ClassContextProfileRepository repository;

    public ClassContextProfileService(ClassContextProfileRepository repository) {
        this.repository = repository;
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ClassContextProfile find() {
        return repository.findById(SINGLETON_ID).orElse(null);
    }

    /**
     * Returns the context string for injection into the prompt.
     * Returns null if no profile has been saved yet — callers treat null
     * as "no class context configured, skip the block."
     */
    @Transactional(readOnly = true)
    public String getContext() {
        return repository.findById(SINGLETON_ID)
                .map(ClassContextProfile::getContext)
                .filter(c -> c != null && !c.isBlank())
                .orElse(null);
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    /**
     * Upserts the class context paragraph.
     * Passing null or blank clears the context.
     */
    @Transactional
    public ClassContextProfile upsert(String context) {
        ClassContextProfile profile = repository.findById(SINGLETON_ID)
                .orElseGet(() -> {
                    ClassContextProfile created = new ClassContextProfile();
                    created.setId(SINGLETON_ID);
                    return created;
                });

        profile.setContext(context == null || context.isBlank() ? null : context.trim());

        ClassContextProfile saved = repository.save(profile);
        log.info("Upserted class context profile");
        return saved;
    }
}