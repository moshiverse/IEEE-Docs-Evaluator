package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.PromptTemplate;
import com.ieee.evaluator.service.PromptTemplateService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/professor")
@Slf4j
public class PromptTemplateController {

    private final PromptTemplateService service;

    public PromptTemplateController(PromptTemplateService service) {
        this.service = service;
    }

    // ── GET /api/professor/prompt-templates ───────────────────────────────────

    @GetMapping("/prompt-templates")
    public ResponseEntity<List<PromptTemplate>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    // ── POST /api/professor/prompt-templates ──────────────────────────────────

    /**
     * Request body:
     * {
     *   "name":    "Strict Final Submission",
     *   "content": "Be extremely strict on diagrams..."
     * }
     */
    @PostMapping("/prompt-templates")
    public ResponseEntity<?> create(@RequestBody Map<String, String> payload) {
        try {
            PromptTemplate saved = service.create(
                payload.get("name"),
                payload.get("content")
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to create prompt template: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to create template: " + e.getMessage()));
        }
    }

    // ── PUT /api/professor/prompt-templates/{id} ──────────────────────────────

    /**
     * Request body:
     * {
     *   "name":    "Updated Name",
     *   "content": "Updated instructions..."
     * }
     */
    @PutMapping("/prompt-templates/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        try {
            PromptTemplate saved = service.update(
                id,
                payload.get("name"),
                payload.get("content")
            );
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to update prompt template id={}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to update template: " + e.getMessage()));
        }
    }

    // ── DELETE /api/professor/prompt-templates/{id} ───────────────────────────

    @DeleteMapping("/prompt-templates/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return ResponseEntity.ok(Map.of("message", "Template deleted successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to delete prompt template id={}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to delete template: " + e.getMessage()));
        }
    }
}