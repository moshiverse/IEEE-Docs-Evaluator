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
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Gemini (Google AI) provider — text-based evaluation via REST.
 *
 * All configuration (API key, model) is read from the system_settings table
 * at request time via DynamicConfigService — no restart needed after changes.
 *
 * Setting keys consumed:
 *   GEMINI_API_KEY  – secret key, value masked in the Settings UI
 *   GEMINI_MODEL    – e.g. "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"
 *
 * NOTE: This class handles the standard Gemini REST API (text input).
 *       The PDF-vision provider (Gemini3FlashLiteProvider) is a separate bean.
 */
@Service
@Slf4j
public class GeminiProvider implements AiProvider {

    // ── Setting keys ──────────────────────────────────────────────────────────
    private static final String KEY_API_KEY = "GEMINI_API_KEY";
    private static final String KEY_MODEL   = "GEMINI_MODEL";

    // ── Endpoint template (model and key injected at runtime) ─────────────────
    private static final String API_URL_TEMPLATE =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final SystemSettingService settingsService;
    private final RestTemplate         restTemplate;
    private final ObjectMapper         objectMapper = new ObjectMapper();

    public GeminiProvider(
        SystemSettingService settingsService,
        @Qualifier("aiRestTemplate") RestTemplate restTemplate
    ) {
        this.settingsService = settingsService;
        this.restTemplate = restTemplate;
    }

    // ── AiProvider ────────────────────────────────────────────────────────────

    @Override
    public String getProviderName() {
        return "gemini";
    }

    @Override
    public String analyze(String text) {
        // Read config fresh on every call.
        String apiKey = settingsService.getValueOrNull(KEY_API_KEY);
        String model  = settingsService.getValueOrNull(KEY_MODEL);

        if (isBlank(apiKey)) {
            return "EVALUATION ERROR: Gemini API key is not configured. " +
                   "Please add GEMINI_API_KEY in System Settings.";
        }
        if (isBlank(model)) {
            return "EVALUATION ERROR: Gemini model is not configured. " +
                "Please set GEMINI_MODEL in System Settings.";
        }

        try {
            return callGemini(apiKey.trim(), model.trim(), text);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 404) {
                String fallbackModel = findFirstSupportedGeminiModel(apiKey.trim());
                if (!isBlank(fallbackModel) && !fallbackModel.equalsIgnoreCase(model.trim())) {
                    log.warn("GEMINI_MODEL '{}' not found; retrying with discovered model '{}'", model.trim(), fallbackModel);
                    try {
                        return callGemini(apiKey.trim(), fallbackModel, text);
                    } catch (Exception retryException) {
                        log.error("Gemini retry with fallback model failed: {}", retryException.getMessage(), retryException);
                    }
                }
            }
            return handleHttpError(e, "Gemini");
        } catch (Exception e) {
            log.error("Gemini analysis failed: {}", e.getMessage(), e);
            return "EVALUATION ERROR: Gemini request failed — " + e.getMessage();
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private String callGemini(String apiKey, String model, String documentText) throws com.fasterxml.jackson.core.JsonProcessingException {
        String truncated = truncate(documentText, 8_000);
        String prompt    = buildPrompt(truncated);
        String url       = String.format(API_URL_TEMPLATE, model, apiKey);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
            ),
            "generationConfig", Map.of("temperature", 0.3)
        );

        String jsonBody = objectMapper.writeValueAsString(requestBody);
        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(
            url, HttpMethod.POST, entity, String.class
        );

        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("candidates")
                   .get(0)
                   .path("content")
                   .path("parts")
                   .get(0)
                   .path("text")
                   .asText();
    }

    private String handleHttpError(HttpClientErrorException e, String provider) {
        int status = e.getStatusCode().value();
        String reason = switch (status) {
            case 401 -> "Invalid or expired API key. Please update your " + provider + " API key in System Settings.";
            case 429 -> "Rate limit exceeded. Please wait a moment and try again, or upgrade your " + provider + " quota.";
            case 400 -> "Bad request sent to " + provider + ". This may indicate an invalid model name.";
            default  -> provider + " returned HTTP " + status + ": " + e.getResponseBodyAsString();
        };
        log.warn("{} HTTP error {}: {}", provider, status, reason);
        return "EVALUATION ERROR: " + reason;
    }

    private static String truncate(String text, int maxChars) {
        return (text != null && text.length() > maxChars)
               ? text.substring(0, maxChars) + "...[truncated]"
               : text;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private String findFirstSupportedGeminiModel(String apiKey) {
        String listUrl = String.format(Locale.ROOT,
            "https://generativelanguage.googleapis.com/v1beta/models?key=%s", apiKey);

        try {
            ResponseEntity<String> response = restTemplate.exchange(listUrl, HttpMethod.GET, null, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode modelsNode = root.path("models");

            List<String> models = new ArrayList<>();
            if (modelsNode.isArray()) {
                for (JsonNode modelNode : modelsNode) {
                    if (!supportsGenerateContent(modelNode.path("supportedGenerationMethods"))) {
                        continue;
                    }
                    String raw = modelNode.path("name").asText("");
                    String normalized = raw.replace("models/", "").trim();
                    if (!normalized.isBlank()) {
                        models.add(normalized);
                    }
                }
            }

            return models.isEmpty() ? null : models.get(0);
        } catch (Exception e) {
            log.warn("Unable to discover fallback Gemini model: {}", e.getMessage());
            return null;
        }
    }

    private boolean supportsGenerateContent(JsonNode methodsNode) {
        if (!methodsNode.isArray()) {
            return false;
        }

        for (JsonNode methodNode : methodsNode) {
            if ("generateContent".equalsIgnoreCase(methodNode.asText(""))) {
                return true;
            }
        }
        return false;
    }

    // ── Prompt ────────────────────────────────────────────────────────────────

    private static String buildPrompt(String documentContent) {
        return """
            You are an expert evaluator of software engineering documents following IEEE standards.

            STEP 1 — Identify the document type:
            * SRS (IEEE 830 Software Requirements Specification)
            * SDD (IEEE 1016 Software Design Description)
            * SPMP (IEEE 1058 Software Project Management Plan)
            * STD (IEEE 829 Software Test Documentation)

            If the document is empty, unreadable, or not a software engineering document, reply exactly:
            ERROR: Invalid Software Engineering document.

            STEP 2 — Evaluate using the correct rubric:
            For SRS: Introduction & Scope | Overall Description | Functional Requirements | Non-Functional Requirements | External Interfaces
            For SDD: System Architecture | Data Design | Component Design | Interface Design | Design Decisions
            For SPMP: Project Scope & Objectives | Scheduling & Timeline | Resource Allocation | Risk Management | Monitoring & Control
            For STD: Test Plan | Test Cases | Test Procedures | Test Coverage | Traceability to Requirements

            STEP 3 — Score each criterion 1–5 (1=Poor/Missing, 5=Excellent).

            STEP 4 — Output EXACTLY in this format:

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

            IMPORTANT: Be strict and realistic. Do NOT inflate scores. Do not hallucinate sections.

            DOCUMENT:
            """ + documentContent;
    }
}