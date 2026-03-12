package com.ieee.evaluator.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class OpenAiProvider implements AiProvider {

    private final DynamicConfigService configService;
    private final RestTemplate restTemplate = new RestTemplate();

    public OpenAiProvider(DynamicConfigService configService) {
        this.configService = configService;
    }

    @Override
    public String getProviderName() {
        return "openai";
    }

    @Override
    @SuppressWarnings("unchecked")
    public String analyze(String text) throws Exception {
        // DYNAMIC: Fetch the API key straight from Supabase!
        String openAiKey = configService.getValue("OPENAI_API_KEY");
        
        String url = "https://api.openai.com/v1/chat/completions";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiKey);

        String prompt = """
            Evaluate this IEEE 830 SRS.

            If empty, unreadable, or not software engineering, reply:
            ERROR: Invalid Software Engineering document.

            Otherwise respond with:
            Summary
            Strengths
            Weaknesses
            Conclusion

            2–3 bullet points per section.

            DOCUMENT:
            """ + text;

        Map<String, Object> body = Map.of(
            "model", "gpt-4o-mini",
            "messages", List.of(Map.of("role", "user", "content", prompt)),
            "max_tokens", 400
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        if (response.getBody() == null || !response.getBody().containsKey("choices")) {
            return "Failed to parse OpenAI response.";
        }

        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }
}