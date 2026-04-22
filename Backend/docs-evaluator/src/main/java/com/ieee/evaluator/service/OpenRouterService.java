package com.ieee.evaluator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OpenRouterService implements AiProvider {

    private final DynamicConfigService configService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String httpReferer;
    private final String appTitle;

    // We can leave the URL and Model hardcoded for now, or move them to the DB later!
    private final String apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    private final String model = "openrouter/free"; 

    public OpenRouterService(
            DynamicConfigService configService,
            @Value("${app.openrouter.http-referer:https://localhost}") String httpReferer,
            @Value("${app.openrouter.app-title:IEEE Docs Evaluator}") String appTitle
    ) {
        this.configService = configService;
        this.httpReferer = httpReferer;
        this.appTitle = appTitle;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000); 
        factory.setReadTimeout(60000);    
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String getProviderName() {
        return "openrouter";
    }

    @Override
    public String analyze(String documentContent) throws Exception {
        return analyze(documentContent, List.of());
    }

    @Override
    public String analyze(String documentContent, List<String> base64Images) throws Exception {
        // DYNAMIC: Fetch the OpenRouter API key straight from Supabase!
        String apiKey = configService.getValue("OPENROUTER_API_KEY");

        if (apiKey == null || apiKey.isEmpty()) {
            return "SYSTEM ERROR: OpenRouter API key not configured in the database.";
        }

        try {
            String prompt = buildAnalysisPrompt(documentContent);
            return callOpenRouterAPI(prompt, base64Images, apiKey);
        } catch (Exception e) {
            log.error("AI analysis failed: {}", e.getMessage(), e);
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
            %s

            """.formatted(truncatedContent);
    }

    private String callOpenRouterAPI(String prompt, List<String> base64Images, String dynamicApiKey) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(dynamicApiKey); // Uses the dynamic key!
        headers.set("HTTP-Referer", httpReferer);
        headers.set("X-Title", appTitle);

        try {
            List<Map<String, Object>> contentList = new ArrayList<>();
            Map<String, Object> textContent = new HashMap<>();
            textContent.put("type", "text");
            textContent.put("text", prompt);
            contentList.add(textContent);

            if (base64Images != null) {
                for (String image : base64Images) {
                    if (image == null || image.isBlank()) {
                        continue;
                    }
                    Map<String, Object> imageContent = new HashMap<>();
                    imageContent.put("type", "image_url");
                    imageContent.put("image_url", Map.of("url", "data:image/png;base64," + image));
                    contentList.add(imageContent);
                }
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(
                Map.of("role", "user", "content", contentList)
            ));
            requestBody.put("temperature", 0.3);
            // requestBody.put("max_tokens", 1200); 

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.POST, entity, String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && choices.size() > 0) {
                    return choices.get(0).path("message").path("content").asText();
                }
            }
            throw new RuntimeException("Invalid API response");
        } catch (Exception e) {
            throw new RuntimeException("AI service unavailable: " + e.getMessage(), e);
        }
    }
}