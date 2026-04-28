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

    private static final Set<String> ALLOWED_PROVIDERS = Set.of("openai");
    private static final String OPENAI_MODELS_URL = "https://api.openai.com/v1/models";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiSettingsValidationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<String> validateEffectiveSettings(
        String activeProvider,
        String openAiKey,
        String openAiModel
    ) {
        List<String> errors = new ArrayList<>();

        String provider = trimOrEmpty(activeProvider).toLowerCase(Locale.ROOT);
        String openAiApiKey = trimOrEmpty(openAiKey);
        String openAiSelectedModel = trimOrEmpty(openAiModel);

        if (!ALLOWED_PROVIDERS.contains(provider)) {
            errors.add("ACTIVE_AI_PROVIDER must be 'openai'.");
            return errors;
        }

        if ("openai".equals(provider)) {
            validateOpenAi(openAiApiKey, openAiSelectedModel, errors);
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