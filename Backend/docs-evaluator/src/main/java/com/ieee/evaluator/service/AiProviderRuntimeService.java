package com.ieee.evaluator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@Slf4j
public class AiProviderRuntimeService {

    private static final String OPENAI_MODELS_URL = "https://api.openai.com/v1/models";

    private final SystemSettingService settings;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiProviderRuntimeService(SystemSettingService settings, RestTemplate restTemplate) {
        this.settings = settings;
        this.restTemplate = restTemplate;
    }

    public AiRuntimeResponse getAiRuntime() {
        String activeProvider = normalizeProvider(settings.getValueOrNull(SystemSettingService.ACTIVE_AI_PROVIDER));
        String openAiModel = trimOrEmpty(settings.getValueOrNull(SystemSettingService.OPENAI_MODEL));
        String openAiKey = trimOrEmpty(settings.getValueOrNull(SystemSettingService.OPENAI_API_KEY));

        ProviderRuntimeOption openAi = new ProviderRuntimeOption(
            "openai",
            "OpenAI",
            !openAiKey.isBlank(),
            openAiModel,
            fetchOpenAiModels(openAiKey, openAiModel)
        );

        return new AiRuntimeResponse(activeProvider, List.of(openAi));
    }

    private List<String> fetchOpenAiModels(String apiKey, String selectedModel) {
        Set<String> options = new HashSet<>();
        if (!selectedModel.isBlank()) {
            options.add(selectedModel);
        }

        if (apiKey.isBlank() || !apiKey.startsWith("sk-")) {
            return sorted(options);
        }

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

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("data");
            if (data.isArray()) {
                for (JsonNode modelNode : data) {
                    String id = trimOrEmpty(modelNode.path("id").asText());
                    if (!id.isBlank()) {
                        options.add(id);
                    }
                }
            }
        } catch (HttpClientErrorException e) {
            log.warn("Unable to fetch OpenAI model list dynamically: HTTP {}", e.getStatusCode().value());
        } catch (Exception e) {
            log.warn("Unable to fetch OpenAI model list dynamically: {}", sanitizeLogMessage(e.getMessage()));
        }

        return sorted(options);
    }

    private List<String> sorted(Set<String> values) {
        List<String> list = new ArrayList<>(values);
        list.sort(Comparator.naturalOrder());
        return list;
    }

    private String normalizeProvider(String value) {
        String normalized = trimOrEmpty(value).toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? "openai" : normalized;
    }

    private String trimOrEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private String sanitizeLogMessage(String message) {
        if (message == null || message.isBlank()) {
            return "unknown error";
        }

        return message
            .replaceAll("AIza[0-9A-Za-z_\\-]{20,}", "AIza***")
            .replaceAll("sk-[0-9A-Za-z_\\-]{10,}", "sk-***");
    }

    public record AiRuntimeResponse(
        String activeProvider,
        List<ProviderRuntimeOption> providers
    ) {}

    public record ProviderRuntimeOption(
        String id,
        String label,
        boolean apiKeyConfigured,
        String selectedModel,
        List<String> availableModels
    ) {}
}