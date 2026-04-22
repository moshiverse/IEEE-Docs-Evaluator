package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class SpmpPromptService {

    public String rubricSection() {
        return """
            For SPMP (IEEE 1058):
            * Project Scope and Objectives
            * Scheduling and Timeline
            * Resource Allocation
            * Risk Management
            * Monitoring and Control
            """;
    }
}
