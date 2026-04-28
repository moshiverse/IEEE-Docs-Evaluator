package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.ProfessorDocProfile;
import com.ieee.evaluator.service.ProfessorDocProfileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/professor")
@Slf4j
public class ProfessorDocProfileController {

    private final ProfessorDocProfileService service;

    public ProfessorDocProfileController(ProfessorDocProfileService service) {
        this.service = service;
    }

    // ── GET /api/professor/doc-profiles ───────────────────────────────────────

    @GetMapping("/doc-profiles")
    public ResponseEntity<List<ProfessorDocProfile>> getAllProfiles() {
        return ResponseEntity.ok(service.findAll());
    }

    // ── PUT /api/professor/doc-profiles/{docType} ─────────────────────────────

    /**
     * Upserts the rubric and/or diagram section override for a document type.
     *
     * Request body (both fields optional):
     * {
     *   "rubricSection":  "...",
     *   "diagramSection": "..."
     * }
     *
     * Passing null or blank for a field clears that override and reverts to the hardcoded default.
     */
    @PutMapping("/doc-profiles/{docType}")
    public ResponseEntity<?> upsertProfile(
            @PathVariable String docType,
            @RequestBody Map<String, String> payload) {
        try {
            String rubricSection  = payload.get("rubricSection");
            String diagramSection = payload.get("diagramSection");

            ProfessorDocProfile saved = service.upsert(docType, rubricSection, diagramSection);
            return ResponseEntity.ok(saved);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to upsert doc profile for docType={}: {}", docType, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to save profile: " + e.getMessage()));
        }
    }
}