package com.ieee.evaluator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * OpenAI provider.
 *
 * All configuration (API key, model) is read from the system_settings table
 * at request time via DynamicConfigService — no restart needed after changes.
 *
 * Setting keys consumed:
 *   OPENAI_API_KEY  – secret key, value masked in the Settings UI
 *   OPENAI_MODEL    – e.g. "gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"
 */
@Service
@Slf4j
public class OpenAiProvider implements AiProvider {

    // ── Setting keys ──────────────────────────────────────────────────────────
    private static final String KEY_API_KEY = "OPENAI_API_KEY";
    private static final String KEY_MODEL   = "OPENAI_MODEL";

    // ── Endpoint ──────────────────────────────────────────────────────────────
    private static final String API_URL = "https://api.openai.com/v1/chat/completions";

    private final SystemSettingService settingsService;
    private final RestTemplate         restTemplate;
    private final ObjectMapper         objectMapper = new ObjectMapper();

    public OpenAiProvider(
        SystemSettingService settingsService,
        @Qualifier("aiRestTemplate") RestTemplate restTemplate
    ) {
        this.settingsService = settingsService;
        this.restTemplate = restTemplate;
    }

    // ── AiProvider ────────────────────────────────────────────────────────────

    @Override
    public String getProviderName() {
        return "openai";
    }

    @Override
    public String analyze(String text) {
        // Read config fresh on every call — enables zero-restart updates.
        String apiKey = settingsService.getValueOrNull(KEY_API_KEY);
        String model  = settingsService.getValueOrNull(KEY_MODEL);

        if (isBlank(apiKey)) {
            return "EVALUATION ERROR: OpenAI API key is not configured. " +
                   "Please add OPENAI_API_KEY in System Settings.";
        }
        if (isBlank(model)) {
            return "EVALUATION ERROR: OpenAI model is not configured. " +
                "Please set OPENAI_MODEL in System Settings.";
        }

        try {
            return callOpenAi(apiKey.trim(), model.trim(), text);
        } catch (HttpClientErrorException e) {
            return handleHttpError(e, "OpenAI");
        } catch (Exception e) {
            log.error("OpenAI analysis failed: {}", e.getMessage(), e);
            return "EVALUATION ERROR: OpenAI request failed — " + e.getMessage();
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private String callOpenAi(String apiKey, String model, String documentText) throws com.fasterxml.jackson.core.JsonProcessingException {
        String truncated = truncate(documentText, 8_000);
        String prompt    = buildPrompt(truncated);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
            "model",    model,
            "messages", List.of(Map.of("role", "user", "content", prompt))
        );

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

    private static String truncate(String text, int maxChars) {
        return (text != null && text.length() > maxChars)
               ? text.substring(0, maxChars) + "...[truncated]"
               : text;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
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

            STEP 1.5 — Always check and extract these document details before evaluation:
            * Is the Document Empty?
            * Document Type
            * Document Title
            * Name of Members
            * Chapter Breakdown (per section heading)

            STEP 2 — Evaluate using the correct rubric:
            For SRS: Introduction & Scope | Overall Description | Functional Requirements | Non-Functional Requirements | External Interfaces
            For SDD: System Architecture | Data Design | Component Design | Interface Design | Design Decisions
            For SPMP: Project Scope & Objectives | Scheduling & Timeline | Resource Allocation | Risk Management | Monitoring & Control
            For STD: Test Plan | Test Cases | Test Procedures | Test Coverage | Traceability to Requirements

            STEP 3 — Score each criterion 1–5 (1=Poor/Missing, 5=Excellent).

            STEP 4 — Output EXACTLY in this format:

            Is the Document Empty?: <Yes/No>
            Document Title: <title or Not specified>
            Name of Members: <names or Not specified>
            Chapter Breakdown:
            * <Chapter/Section 1>
            * <etc.>

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