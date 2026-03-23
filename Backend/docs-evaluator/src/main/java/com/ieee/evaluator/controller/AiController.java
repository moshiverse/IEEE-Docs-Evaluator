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

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeFile(@RequestBody Map<String, String> payload) {
        try {
            String fileId = payload.get("fileId");
            String fileName = payload.get("fileName");
            String model = payload.get("model");
            
            if (fileId == null || model == null || fileName == null) {
                return ResponseEntity.badRequest().body("Missing fileId, fileName, or model");
            }
            
            String result = aiService.analyzeDocument(fileId, fileName, model);
            return ResponseEntity.ok(Map.of("analysis", result));
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
            return ResponseEntity.ok(historyRepository
                .findByIsSentTrueAndFileNameContainingIgnoreCaseOrderByEvaluatedAtDesc(groupCode));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to load student reports."));
        }
    }
}