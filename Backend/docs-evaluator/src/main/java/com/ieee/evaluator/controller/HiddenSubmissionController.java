package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.HiddenSubmission;
import com.ieee.evaluator.repository.HiddenSubmissionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/submissions")
@Slf4j
public class HiddenSubmissionController {

    private final HiddenSubmissionRepository repository;

    public HiddenSubmissionController(HiddenSubmissionRepository repository) {
        this.repository = repository;
    }

    // ── GET /api/submissions/hidden ───────────────────────────────────────────
    // Returns a flat list of all hidden file IDs

    @GetMapping("/hidden")
    public ResponseEntity<List<String>> getHiddenFileIds() {
        return ResponseEntity.ok(repository.findAllFileIds());
    }

    // ── POST /api/submissions/hidden ──────────────────────────────────────────
    // Hides a submission by file ID

    @PostMapping("/hidden")
    public ResponseEntity<?> hideSubmission(@RequestBody Map<String, String> payload) {
        try {
            String fileId = payload.get("fileId");
            if (fileId == null || fileId.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "fileId is required."));
            }

            HiddenSubmission hidden = new HiddenSubmission();
            hidden.setFileId(fileId.trim());
            repository.save(hidden);

            return ResponseEntity.ok(Map.of("message", "Submission hidden successfully."));
        } catch (Exception e) {
            log.error("Failed to hide submission: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to hide submission: " + e.getMessage()));
        }
    }

    // ── DELETE /api/submissions/hidden/{fileId} ───────────────────────────────
    // Restores a hidden submission

    @DeleteMapping("/hidden/{fileId}")
    public ResponseEntity<?> restoreSubmission(@PathVariable String fileId) {
        try {
            if (!repository.existsById(fileId)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Submission not found in hidden list."));
            }
            repository.deleteById(fileId);
            return ResponseEntity.ok(Map.of("message", "Submission restored successfully."));
        } catch (Exception e) {
            log.error("Failed to restore submission fileId={}: {}", fileId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to restore submission: " + e.getMessage()));
        }
    }
}