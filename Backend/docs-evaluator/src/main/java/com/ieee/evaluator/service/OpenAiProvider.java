package com.ieee.evaluator.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class OpenAiProvider implements AiProvider {

    private final DynamicConfigService configService;
    private final RestTemplate restTemplate = new RestTemplate();

    public OpenAiProvider(DynamicConfigService configService) {
        this.configService = configService;
    }

    @Override
    public String getProviderName() {
        return "openai";
    }

    @Override
    @SuppressWarnings("unchecked")
    public String analyze(String text) throws Exception {
        // DYNAMIC: Fetch the API key straight from Supabase!
        String openAiKey = configService.getValue("OPENAI_API_KEY");
        
        String url = "https://api.openai.com/v1/chat/completions";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiKey);

        String truncatedContent = text.length() > 8000
            ? text.substring(0, 8000) + "...[truncated]"
            : text;

        String prompt = """
            You are an expert evaluator of software engineering documents following IEEE standards.

            STEP 1 — Identify the document type:

            * SRS (IEEE 830 Software Requirements Specification)
            * SDD (IEEE 1016 Software Design Description)
            * SPMP (IEEE 1058 Software Project Management Plan)
            * STD (IEEE 829 Software Test Documentation)

            If the document is empty, unreadable, or not a software engineering document, reply exactly:
            ERROR: Invalid Software Engineering document.

            STEP 2 — Evaluate the document using the correct rubric:

            For SRS (IEEE 830), evaluate:
            * Introduction & Scope
            * Overall Description
            * Functional Requirements
            * Non-Functional Requirements
            * External Interfaces

            For SDD (IEEE 1016), evaluate:
            * System Architecture
            * Data Design
            * Component Design
            * Interface Design
            * Design Decisions

            For SPMP (IEEE 1058), evaluate:
            * Project Scope & Objectives
            * Scheduling & Timeline
            * Resource Allocation
            * Risk Management
            * Monitoring & Control

            For STD (IEEE 829), evaluate:
            * Test Plan
            * Test Cases
            * Test Procedures
            * Test Coverage
            * Traceability to Requirements

            STEP 3 — Score each criterion from 1 to 5:
            1 = Poor / Missing
            2 = Weak
            3 = Acceptable
            4 = Good
            5 = Excellent

            STEP 4 — Provide structured output EXACTLY in this format:

            Document Type: <Detected Type>

            Overall Score: X/25

            Summary:
            * (2–3 bullet points)

            Rubric Evaluation:
            * <Criterion 1>: X/5 — (short justification)
            * <Criterion 2>: X/5 — (short justification)
            * <Criterion 3>: X/5 — (short justification)
            * <Criterion 4>: X/5 — (short justification)
            * <Criterion 5>: X/5 — (short justification)

            Strengths:
            * (2–3 bullet points)

            Weaknesses:
            * (2–3 bullet points)

            Missing or Incomplete Sections:
            * (list specific missing parts, if any)

            Recommendations:
            * (2–3 actionable improvements)

            Conclusion:
            * (overall quality judgment)

            IMPORTANT:
            * Be strict and realistic (like a professor grading a capstone)
            * Do NOT inflate scores
            * Base evaluation only on the provided content
            * Do not hallucinate sections—if a section is missing, mark it as missing

            DOCUMENT:
            """ + truncatedContent;

        Map<String, Object> body = Map.of(
            "model", "gpt-4o-mini",
            "messages", List.of(Map.of("role", "user", "content", prompt))
            // "max_tokens", 1200
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        if (response.getBody() == null || !response.getBody().containsKey("choices")) {
            return "Failed to parse OpenAI response.";
        }

        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }
}