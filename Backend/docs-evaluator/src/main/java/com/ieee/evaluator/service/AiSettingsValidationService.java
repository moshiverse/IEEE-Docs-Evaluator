package com.ieee.evaluator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AiSettingsValidationService {

    private static final Set<String> ALLOWED_PROVIDERS = Set.of("openai", "gemini");
    private static final String OPENAI_MODELS_URL = "https://api.openai.com/v1/models";
    private static final String GEMINI_MODELS_URL_TEMPLATE =
        "https://generativelanguage.googleapis.com/v1beta/models?key=%s";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiSettingsValidationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<String> validateEffectiveSettings(
        String activeProvider,
        String openAiKey,
        String openAiModel,
        String geminiKey,
        String geminiModel
    ) {
        List<String> errors = new ArrayList<>();

        String provider = trimOrEmpty(activeProvider).toLowerCase(Locale.ROOT);
        String openAiApiKey = trimOrEmpty(openAiKey);
        String openAiSelectedModel = trimOrEmpty(openAiModel);
        String geminiApiKey = trimOrEmpty(geminiKey);
        String geminiSelectedModel = trimOrEmpty(geminiModel);

        if (!ALLOWED_PROVIDERS.contains(provider)) {
            errors.add("ACTIVE_AI_PROVIDER must be either 'openai' or 'gemini'.");
            return errors;
        }

        if ("openai".equals(provider)) {
            validateOpenAi(openAiApiKey, openAiSelectedModel, errors);
        }

        if ("gemini".equals(provider)) {
            validateGemini(geminiApiKey, geminiSelectedModel, errors);
        }

        return errors;
    }

    private void validateOpenAi(String apiKey, String model, List<String> errors) {
        if (apiKey.isBlank()) {
            errors.add("OPENAI_API_KEY is required when ACTIVE_AI_PROVIDER is openai.");
        }
        if (!apiKey.isBlank() && !apiKey.startsWith("sk-")) {
            errors.add("OPENAI_API_KEY appears invalid. OpenAI keys should start with 'sk-'.");
        }
        if (model.isBlank()) {
            errors.add("OPENAI_MODEL is required when ACTIVE_AI_PROVIDER is openai.");
        }
        if (!errors.isEmpty()) {
            return;
        }

        Set<String> models;
        try {
            models = fetchOpenAiModels(apiKey);
        } catch (IllegalArgumentException e) {
            errors.add(e.getMessage());
            return;
        }

        if (!models.contains(model)) {
            errors.add("OPENAI_MODEL '" + model + "' is not available for the provided OpenAI API key.");
        }
    }

    private void validateGemini(String apiKey, String model, List<String> errors) {
        if (apiKey.isBlank()) {
            errors.add("GEMINI_API_KEY is required when ACTIVE_AI_PROVIDER is gemini.");
        }
        if (!apiKey.isBlank() && apiKey.startsWith("sk-")) {
            errors.add("GEMINI_API_KEY appears invalid. Gemini keys should not be OpenAI-style keys.");
        }
        if (model.isBlank()) {
            errors.add("GEMINI_MODEL is required when ACTIVE_AI_PROVIDER is gemini.");
        }
        if (!errors.isEmpty()) {
            return;
        }

        Set<String> models;
        try {
            models = fetchGeminiModels(apiKey);
        } catch (IllegalArgumentException e) {
            errors.add(e.getMessage());
            return;
        }

        if (!models.contains(model)) {
            errors.add("GEMINI_MODEL '" + model + "' is not supported for generateContent with the provided Gemini API key.");
        }
    }

    private Set<String> fetchOpenAiModels(String apiKey) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ResponseEntity<String> response = restTemplate.exchange(
                OPENAI_MODELS_URL,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
            );

            Set<String> models = new HashSet<>();
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("data");
            if (data.isArray()) {
                for (JsonNode modelNode : data) {
                    String id = trimOrEmpty(modelNode.path("id").asText());
                    if (!id.isBlank()) {
                        models.add(id);
                    }
                }
            }
            return models;
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new IllegalArgumentException("OPENAI_API_KEY is invalid (401 Unauthorized).");
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("OpenAI validation failed with HTTP " + e.getStatusCode().value() + ".");
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to validate OpenAI settings right now. Please try again.");
        }
    }

    private Set<String> fetchGeminiModels(String apiKey) {
        try {
            String url = String.format(Locale.ROOT, GEMINI_MODELS_URL_TEMPLATE, apiKey);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, null, String.class);

            Set<String> models = new HashSet<>();
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("models");
            if (data.isArray()) {
                for (JsonNode modelNode : data) {
                    if (!supportsGenerateContent(modelNode.path("supportedGenerationMethods"))) {
                        continue;
                    }

                    String name = trimOrEmpty(modelNode.path("name").asText());
                    if (!name.isBlank()) {
                        models.add(name.replace("models/", ""));
                    }
                }
            }
            return models;
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new IllegalArgumentException("GEMINI_API_KEY is invalid (401 Unauthorized).");
        } catch (HttpClientErrorException.BadRequest e) {
            throw new IllegalArgumentException("GEMINI_API_KEY is invalid (400 Bad Request).");
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("Gemini validation failed with HTTP " + e.getStatusCode().value() + ".");
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to validate Gemini settings right now. Please try again.");
        }
    }

    private boolean supportsGenerateContent(JsonNode methodsNode) {
        if (!methodsNode.isArray()) {
            return false;
        }

        for (JsonNode methodNode : methodsNode) {
            if ("generateContent".equalsIgnoreCase(trimOrEmpty(methodNode.asText()))) {
                return true;
            }
        }
        return false;
    }

    private String trimOrEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}