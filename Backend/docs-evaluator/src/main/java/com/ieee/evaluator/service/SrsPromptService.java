package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class SrsPromptService {

    public String rubricSection() {
        return """
            For SRS (IEEE 830):
            * Introduction and Scope
            * Overall Description
            * Functional Requirements
            * Non-Functional Requirements
            * External Interfaces
            """;
    }
}
