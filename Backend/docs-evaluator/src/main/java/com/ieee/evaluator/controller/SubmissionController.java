package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.DriveFile;
import com.ieee.evaluator.service.SubmissionSyncService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@CrossOrigin(origins = "http://localhost:5173")
public class SubmissionController {

    private final SubmissionSyncService syncService;

    public SubmissionController(SubmissionSyncService syncService) {
        this.syncService = syncService;
    }

    @GetMapping("/sync")
    public ResponseEntity<?> syncSubmissions() {
        try {
            List<DriveFile> submissions = syncService.getLatestSubmissions();
            return ResponseEntity.ok(submissions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to sync submissions: " + e.getMessage());
        }
    }
}