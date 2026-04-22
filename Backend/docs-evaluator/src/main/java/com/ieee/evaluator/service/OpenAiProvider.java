package com.ieee.evaluator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * OpenAI provider.
 *
 * All configuration (API key, model) is read from the system_settings table
 * at request time via DynamicConfigService — no restart needed after changes.
 */
@Service
@Slf4j
public class OpenAiProvider implements AiProvider {

    // ── Setting keys ──────────────────────────────────────────────────────────
    private static final String KEY_API_KEY = "OPENAI_API_KEY";
    private static final String KEY_MODEL   = "OPENAI_MODEL";

    // ── Endpoint ──────────────────────────────────────────────────────────────
    private static final String API_URL = "https://api.openai.com/v1/chat/completions";
    private static final String DEFAULT_MODEL = "gpt-4o-mini";

    private final SystemSettingService settingsService;
    private final RestTemplate         restTemplate;
    private final DocumentReviewPromptFactory promptFactory;
    private final ObjectMapper         objectMapper = new ObjectMapper();

    public OpenAiProvider(
        SystemSettingService settingsService,
        DocumentReviewPromptFactory promptFactory,
        @Qualifier("aiRestTemplate") RestTemplate restTemplate
    ) {
        this.settingsService = settingsService;
        this.promptFactory = promptFactory;
        this.restTemplate = restTemplate;
    }

    // ── AiProvider ────────────────────────────────────────────────────────────

    @Override
    public String getProviderName() {
        return "openai";
    }

    @Override
    public String analyze(String text) {
        return analyze(text, List.of(), null, null);
    }

    @Override
    public String analyze(String text, List<String> base64Images) {
        return analyze(text, base64Images, null, null);
    }

    @Override
    public String analyze(String text, List<String> base64Images, String previousEvaluation) {
        return analyze(text, base64Images, previousEvaluation, null);
    }

    @Override
    public String analyze(String text, List<String> base64Images, String previousEvaluation, String customInstructions) {
        // Read config fresh on every call — enables zero-restart updates.
        String apiKey = settingsService.getValueOrNull(KEY_API_KEY);
        String model  = settingsService.getValueOrNull(KEY_MODEL);

        if (isBlank(apiKey)) {
            return "EVALUATION ERROR: OpenAI API key is not configured. " +
                   "Please add OPENAI_API_KEY in System Settings.";
        }
        if (isBlank(model)) {
            model = DEFAULT_MODEL;
        }

        try {
            // FIX 1: Pass customInstructions down into callOpenAi
            return callOpenAi(apiKey.trim(), model.trim(), text, base64Images, previousEvaluation, customInstructions);
        } catch (HttpClientErrorException e) {
            return handleHttpError(e, "OpenAI");
        } catch (Exception e) {
            log.error("OpenAI analysis failed: {}", e.getMessage(), e);
            return "EVALUATION ERROR: OpenAI request failed — " + e.getMessage();
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    // FIX 2: Update method signature to accept customInstructions
    private String callOpenAi(String apiKey, String model, String documentText, List<String> base64Images, String previousEvaluation, String customInstructions)
            throws com.fasterxml.jackson.core.JsonProcessingException {
            
        // FIX 3: Pass customInstructions to the prompt factory
        String prompt = promptFactory.buildPrompt(documentText, previousEvaluation, customInstructions);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        List<Map<String, Object>> contentParts = new ArrayList<>();
        contentParts.add(Map.of("type", "text", "text", prompt));

        if (base64Images != null) {
            int imageIndex = 1;
            for (String image : base64Images) {
                if (isBlank(image)) {
                    continue;
                }

                contentParts.add(Map.of(
                    "type", "text",
                    "text", "[IMG-" + imageIndex + "] Rendered PDF page " + imageIndex
                ));

                Map<String, Object> imageUrl = new HashMap<>();
                imageUrl.put("url", "data:image/jpeg;base64," + image);
                contentParts.add(Map.of("type", "image_url", "image_url", imageUrl));
                imageIndex++;
            }
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(Map.of("role", "user", "content", contentParts)));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(API_URL, request, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("choices")
               .get(0)
               .path("message")
               .path("content")
               .asText();
    }

    private String handleHttpError(HttpClientErrorException e, String provider) {
        int status = e.getStatusCode().value();
        String reason = switch (status) {
            case 401 -> "Invalid or expired API key. Please update your " + provider + " API key in System Settings.";
            case 429 -> "Rate limit exceeded. Please wait a moment and try again, or upgrade your " + provider + " plan.";
            case 400 -> "Bad request sent to " + provider + ". This may indicate a model name mismatch.";
            default  -> provider + " returned HTTP " + status + ": " + e.getResponseBodyAsString();
        };
        log.warn("{} HTTP error {}: {}", provider, status, reason);
        return "EVALUATION ERROR: " + reason;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}