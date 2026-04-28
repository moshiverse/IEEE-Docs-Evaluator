package com.ieee.evaluator.service;

import com.ieee.evaluator.model.ProfessorDocProfile;
import com.ieee.evaluator.repository.ProfessorDocProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class ProfessorDocProfileService {

    private final ProfessorDocProfileRepository repository;

    public ProfessorDocProfileService(ProfessorDocProfileRepository repository) {
        this.repository = repository;
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProfessorDocProfile> findAll() {
        return repository.findAll();
    }

    /**
     * Returns the rubric section override for a given doc type.
     * Returns null if no override is saved, signalling the caller to use the hardcoded default.
     */
    @Transactional(readOnly = true)
    public String getRubricOverride(String docType) {
        return repository.findById(normalizeDocType(docType))
                .map(ProfessorDocProfile::getRubricSection)
                .filter(s -> s != null && !s.isBlank())
                .orElse(null);
    }

    /**
     * Returns the diagram section override for a given doc type.
     * Returns null if no override is saved, signalling the caller to use the hardcoded default.
     */
    @Transactional(readOnly = true)
    public String getDiagramOverride(String docType) {
        return repository.findById(normalizeDocType(docType))
                .map(ProfessorDocProfile::getDiagramSection)
                .filter(s -> s != null && !s.isBlank())
                .orElse(null);
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    /**
     * Upserts the rubric and/or diagram section for a given doc type.
     * Passing null or blank for a field clears that override (reverts to hardcoded default).
     */
    @Transactional
    public ProfessorDocProfile upsert(String docType, String rubricSection, String diagramSection) {
        String key = normalizeDocType(docType);

        ProfessorDocProfile profile = repository.findById(key)
                .orElseGet(() -> {
                    ProfessorDocProfile created = new ProfessorDocProfile();
                    created.setDocType(key);
                    return created;
                });

        // Blank string clears the override — null is treated the same way
        profile.setRubricSection(isBlank(rubricSection) ? null : rubricSection.trim());
        profile.setDiagramSection(isBlank(diagramSection) ? null : diagramSection.trim());

        ProfessorDocProfile saved = repository.save(profile);
        log.info("Upserted doc profile for docType={}", key);
        return saved;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String normalizeDocType(String docType) {
        if (docType == null || docType.isBlank()) {
            throw new IllegalArgumentException("docType must not be blank");
        }
        return docType.trim().toUpperCase();
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}