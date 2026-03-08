package com.ieee.evaluator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
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

    // We can leave the URL and Model hardcoded for now, or move them to the DB later!
    private final String apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    private final String model = "openrouter/free"; 

    public OpenRouterService(DynamicConfigService configService) {
        this.configService = configService;
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
        // DYNAMIC: Fetch the OpenRouter API key straight from Supabase!
        String apiKey = configService.getValue("OPENROUTER_API_KEY");

        if (apiKey == null || apiKey.isEmpty()) {
            return "SYSTEM ERROR: OpenRouter API key not configured in the database.";
        }

        try {
            String prompt = buildAnalysisPrompt(documentContent);
            return callOpenRouterAPI(prompt, apiKey);
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
            
            CRITICAL RULE: If the provided text is empty, unreadable, or is NOT a software engineering document, you must state: "ERROR: This document does not appear to be a valid Software Engineering document. No IEEE analysis can be performed."
            
            If it is a valid document, provide a professional evaluation with the following structure:
            ### Summary Evaluation
            ### Strengths
            ### Weaknesses
            ### Conclusion

            DOCUMENT CONTENT:
            %s
            """.formatted(truncatedContent);
    }

    private String callOpenRouterAPI(String prompt, String dynamicApiKey) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(dynamicApiKey); // Uses the dynamic key!
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