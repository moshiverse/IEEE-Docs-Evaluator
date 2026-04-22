package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class StdPromptService {

    public String rubricSection() {
        return """
            For STD (IEEE 829):
            * Test Plan
            * Test Cases
            * Test Procedures
            * Test Coverage
            * Traceability to Requirements
            """;
    }
}
