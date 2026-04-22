package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.EvaluationHistory;
import com.ieee.evaluator.repository.EvaluationHistoryRepository;
import com.ieee.evaluator.service.AiService;
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

    /**
     * Triggers document analysis. 
     * Now returns a Map containing "analysis" (String) and "images" (List of Base64 Strings).
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeFile(@RequestBody Map<String, String> payload) {
        try {
            String fileId = payload.get("fileId") == null ? null : payload.get("fileId").trim();
            String fileName = payload.get("fileName") == null ? null : payload.get("fileName").trim();
            String model = payload.get("model") == null ? null : payload.get("model").trim();
            String customInstructions = payload.get("customInstructions");
            
            if (fileId == null || fileId.isBlank() || model == null || model.isBlank() || fileName == null || fileName.isBlank()) {
                return ResponseEntity.badRequest().body("Missing fileId, fileName, or model");
            }
            
            // This now returns a Map<String, Object> containing both text and images
            Map<String, Object> result = aiService.analyzeDocument(fileId, fileName, model, customInstructions);
            
            // Returns the full payload to the frontend
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

    @GetMapping("/history")
    public ResponseEntity<?> getHistory() {
        try {
            return ResponseEntity.ok(historyRepository.findAllByOrderByEvaluatedAtDesc());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to retrieve history.");
        }
    }

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

    @GetMapping("/student-reports")
    public ResponseEntity<?> getStudentReports(@RequestParam String groupCode) {
        try {
            // FIX #5 (note): This filters by fileName LIKE %groupCode%, which is broad.
            // If file naming isn't strictly controlled, consider adding a dedicated
            // groupCode column to EvaluationHistory and querying on that instead.
            return ResponseEntity.ok(historyRepository
                .findByIsSentTrueAndFileNameContainingIgnoreCaseOrderByEvaluatedAtDesc(groupCode));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to load student reports."));
        }
    }
}