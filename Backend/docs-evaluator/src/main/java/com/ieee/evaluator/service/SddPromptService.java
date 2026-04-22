package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class SddPromptService {

    public String rubricSection() {
        return """
            For SDD (IEEE 1016):
            * System Architecture
            * Data Design
            * Component Design
            * Interface Design
            * Design Decisions
            """;
    }
}
