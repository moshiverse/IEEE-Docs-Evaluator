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

    @Value("${openrouter.api.key:}")
    private String apiKey;

    @Value("${openrouter.api.url:https://openrouter.ai/api/v1/chat/completions}")
    private String apiUrl;

    @Value("${openrouter.model:openrouter/free}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public OpenRouterService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000); 
        factory.setReadTimeout(15000);    
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String getProviderName() {
        return "openrouter";
    }

    @Override
    public String analyze(String documentContent) throws Exception {
        if (apiKey == null || apiKey.isEmpty()) {
            return "SYSTEM ERROR: OpenRouter API key not configured.";
        }

        try {
            String prompt = buildAnalysisPrompt(documentContent);
            return callOpenRouterAPI(prompt);
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
            You are an IT professor evaluating a Software Requirements Specification (SRS) document based on standard IEEE 830 guidelines.
            
            CRITICAL RULE: If the provided text is empty, unreadable, or is NOT a software engineering document (e.g., it is a certificate, a letter, or random text), you must state: "ERROR: This document does not appear to be a valid Software Engineering document. No IEEE analysis can be performed."
            
            If it is a valid document, provide a professional evaluation with the following structure:
            ### Summary Evaluation
            (A brief overview of the document's quality)

            ### Strengths
            (Bullet points of specific strengths found in the text)

            ### Weaknesses
            (Bullet points of missing IEEE 830 sections or poor quality areas)

            ### Conclusion
            (Final assessment)

            DOCUMENT CONTENT:
            %s
            """.formatted(truncatedContent);
    }

    private String callOpenRouterAPI(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        headers.set("HTTP-Referer", "http://localhost:8080");
        headers.set("X-Title", "IEEE Docs Evaluator");

        try {
            List<Map<String, Object>> contentList = new ArrayList<>();
            Map<String, Object> textContent = new HashMap<>();
            textContent.put("type", "text");
            textContent.put("text", prompt);
            contentList.add(textContent);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(
                Map.of("role", "user", "content", contentList)
            ));
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 400); 

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