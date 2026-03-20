package com.ieee.evaluator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiProvider implements AiProvider {

    private final DynamicConfigService configService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private final String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    public GeminiProvider(DynamicConfigService configService) {
        this.configService = configService;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(60000);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String getProviderName() {
        return "gemini";
    }

    @Override
    public String analyze(String documentContent) throws Exception {
        String apiKey = configService.getValue("GEMINI_API_KEY");

        if (apiKey == null || apiKey.isEmpty()) {
            return "SYSTEM ERROR: Gemini API key not configured in the database.";
        }

        try {
            String prompt = buildAnalysisPrompt(documentContent);
            return callGeminiAPI(prompt, apiKey);
        } catch (Exception e) {
            log.error("Gemini analysis failed: {}", e.getMessage(), e);
            return "SYSTEM ERROR: AI analysis failed. " + e.getMessage();
        }
    }

    private String buildAnalysisPrompt(String documentContent) {
        String truncatedContent = documentContent.length() > 8000
            ? documentContent.substring(0, 8000) + "...[truncated]"
            : documentContent;

        return """
                        You are an expert evaluator of software engineering documents following IEEE standards.

            STEP 1 — Identify the document type:

            * SRS (IEEE 830 Software Requirements Specification)
            * SDD (Software Design Description)
            * SPMP (Software Project Management Plan)
            * STD (Software Test Documentation)

            If the document is empty, unreadable, or not a software engineering document, reply exactly:
            ERROR: Invalid Software Engineering document.

            STEP 2 — Evaluate the document using the correct rubric:

            For SRS (IEEE 830), evaluate:

            * Introduction & Scope
            * Overall Description
            * Functional Requirements
            * Non-Functional Requirements
            * External Interfaces

            For SDD, evaluate:

            * System Architecture
            * Data Design
            * Component Design
            * Interface Design
            * Design Decisions

            For SPMP, evaluate:

            * Project Scope & Objectives
            * Scheduling & Timeline
            * Resource Allocation
            * Risk Management
            * Monitoring & Control

            For STD, evaluate:

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

            DOCUMENT:
            %s
            """.formatted(truncatedContent);
    }

    private String callGeminiAPI(String prompt, String apiKey) {
        // Gemini authenticates via query param, not Authorization header
        String urlWithKey = apiUrl + "?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of("parts", List.of(
                        Map.of("text", prompt)
                    ))
                ),
                "generationConfig", Map.of(
                    "temperature", 0.3,
                    "maxOutputTokens", 800
                )
            );

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                urlWithKey, HttpMethod.POST, entity, String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    return candidates.get(0)
                        .path("content")
                        .path("parts")
                        .get(0)
                        .path("text")
                        .asText();
                }
            }
            throw new RuntimeException("Invalid API response");
        } catch (Exception e) {
            throw new RuntimeException("Gemini service unavailable: " + e.getMessage(), e);
        }
    }
}