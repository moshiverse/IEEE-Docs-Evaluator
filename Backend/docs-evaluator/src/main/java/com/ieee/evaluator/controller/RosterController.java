package com.ieee.evaluator.controller;

import com.ieee.evaluator.model.StudentTrackerRecord;
import com.ieee.evaluator.service.RosterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/roster")
@CrossOrigin(origins = "http://localhost:5173")
public class RosterController {

    private final RosterService rosterService;

    public RosterController(RosterService rosterService) {
        this.rosterService = rosterService;
    }

    @GetMapping
    public ResponseEntity<?> getClassRoster() {
        try {
            List<StudentTrackerRecord> roster = rosterService.getClassRoster();
            return ResponseEntity.ok(roster);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch class roster: " + e.getMessage());
        }
    }
}
