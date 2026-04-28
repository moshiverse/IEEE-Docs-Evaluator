package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.AnalysisResultDTO;
import com.ieee.evaluator.model.EvaluationHistory;
import com.ieee.evaluator.repository.EvaluationHistoryRepository;
import com.ieee.evaluator.service.AiService;

import org.springframework.transaction.annotation.Transactional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final EvaluationHistoryRepository historyRepository;

    public AiController(AiService aiService, EvaluationHistoryRepository historyRepository) {
        this.aiService = aiService;
        this.historyRepository = historyRepository;
    }

    // ── POST /api/ai/analyze ──────────────────────────────────────────────────

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeFile(@RequestBody Map<String, String> payload) {
        try {
            String fileId             = payload.get("fileId")   == null ? null : payload.get("fileId").trim();
            String fileName           = payload.get("fileName") == null ? null : payload.get("fileName").trim();
            String model              = payload.get("model")    == null ? null : payload.get("model").trim();
            String customInstructions = payload.get("customInstructions");

            if (fileId == null || fileId.isBlank() || model == null || model.isBlank() || fileName == null || fileName.isBlank()) {
                return ResponseEntity.badRequest().body("Missing fileId, fileName, or model");
            }

            AnalysisResultDTO result = aiService.analyzeDocument(fileId, fileName, model, customInstructions);
            return ResponseEntity.ok(result);

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Analysis failed: " + e.getMessage()));
        }
    }

    // ── GET /api/ai/history ───────────────────────────────────────────────────

    @GetMapping("/history")
    public ResponseEntity<?> getHistory() {
        try {
            // Only returns records where is_deleted = false
            return ResponseEntity.ok(historyRepository.findAllSummaries());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to retrieve history.");
        }
    }

    // ── PUT /api/ai/history/{id} ──────────────────────────────────────────────

    @PutMapping("/history/{id}")
    public ResponseEntity<?> updateHistoryItem(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            EvaluationHistory history = historyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation record not found"));

            String newResult = payload.get("evaluationResult");
            if (newResult == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "No evaluation result provided"));
            }

            history.setEvaluationResult(newResult);

            if (payload.containsKey("teacherFeedback")) {
                history.setTeacherFeedback(payload.get("teacherFeedback"));
            }

            historyRepository.save(history);
            return ResponseEntity.ok(Map.of("message", "Evaluation updated successfully"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Update failed: " + e.getMessage()));
        }
    }

    // ── PUT /api/ai/history/{id}/send ─────────────────────────────────────────

    @PutMapping("/history/{id}/send")
    public ResponseEntity<?> sendReportToStudent(@PathVariable Long id) {
        try {
            EvaluationHistory history = historyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation record not found"));

            history.setIsSent(true);
            historyRepository.save(history);
            return ResponseEntity.ok(Map.of("message", "Report sent to student successfully"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send: " + e.getMessage()));
        }
    }

    // ── DELETE /api/ai/history/{id} — soft delete ─────────────────────────────

    @DeleteMapping("/history/{id}")
    public ResponseEntity<?> deleteHistoryItem(@PathVariable Long id) {
        try {
            EvaluationHistory history = historyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation record not found"));

            history.setIsDeleted(true);
            historyRepository.save(history);
            return ResponseEntity.ok(Map.of("message", "Report deleted successfully."));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Delete failed: " + e.getMessage()));
        }
    }

    // ── PUT /api/ai/history/{id}/restore ──────────────────────────────────────

    @PutMapping("/history/{id}/restore")
    public ResponseEntity<?> restoreHistoryItem(@PathVariable Long id) {
        try {
            EvaluationHistory history = historyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation record not found"));

            history.setIsDeleted(false);
            historyRepository.save(history);
            return ResponseEntity.ok(Map.of("message", "Report restored successfully."));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Restore failed: " + e.getMessage()));
        }
    }

    // ── GET /api/ai/student-reports ───────────────────────────────────────────

    @GetMapping("/student-reports")
    public ResponseEntity<?> getStudentReports(@RequestParam String groupCode) {
        try {
            return ResponseEntity.ok(historyRepository.findStudentSummaries(groupCode));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to load student reports."));
        }
    }

    // ── GET /api/ai/history/{id} ──────────────────────────────────────────────

    @GetMapping("/history/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getHistoryItem(@PathVariable Long id) {
        try {
            EvaluationHistory history = historyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Evaluation record not found"));

            if (history.getExtractedImages() != null) {
                history.getExtractedImages().size();
            }

            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}