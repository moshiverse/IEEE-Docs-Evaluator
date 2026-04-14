package com.ieee.evaluator.service;

import java.util.List;

public interface AiProvider {
    // The identifier used by the frontend (e.g., "openai", "gemini")
    String getProviderName(); 
    
    // The actual logic to send text to the AI and get the result
    String analyze(String text) throws Exception; 

    // Optional multimodal path. Default keeps existing text-only providers working.
    default String analyze(String documentContent, List<String> base64Images) throws Exception {
        return analyze(documentContent);
    }
    
    default String analyze(String documentContent, List<String> base64Images, String previousEvaluation) throws Exception {
        return analyze(documentContent, base64Images);
    }
}