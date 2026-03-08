package com.ieee.evaluator.service;

import com.ieee.evaluator.model.EvaluationHistory;
import com.ieee.evaluator.repository.EvaluationHistoryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AiService {

    private final GoogleDocsService docsService;
    private final EvaluationHistoryRepository historyRepository;
    private final Map<String, AiProvider> providers;

    public AiService(GoogleDocsService docsService, 
                     EvaluationHistoryRepository historyRepository, 
                     List<AiProvider> providerList) {
        this.docsService = docsService;
        this.historyRepository = historyRepository;
        
        // This automatically builds a map of {"openai": OpenAiService, "openrouter": OpenRouterService}
        this.providers = providerList.stream()
                .collect(Collectors.toMap(p -> p.getProviderName().toLowerCase(), Function.identity()));
    }

    public String analyzeDocument(String fileId, String fileName, String aiModel) throws Exception {
        
        // 1. Directly export the Google Doc as pure text string
        String extractedText = docsService.exportDocAsText(fileId);

        if (extractedText == null || extractedText.trim().isEmpty()) {
            return "ERROR: No readable text found in this document. Please ensure the Google Doc contains text.";
        }

        // 2. Dynamically fetch the correct AI provider
        AiProvider provider = providers.get(aiModel.toLowerCase());
        
        // Quick fallback just in case the frontend still sends "GPT" instead of "openrouter"
        if (provider == null && "gpt".equalsIgnoreCase(aiModel)) {
            provider = providers.get("openrouter");
        }

        if (provider == null) {
            return "ERROR: Model provider '" + aiModel + "' is not supported.";
        }

        // 3. Run the analysis
        String result = provider.analyze(extractedText);

        // 4. Save to Supabase
        EvaluationHistory history = new EvaluationHistory();
        history.setFileId(fileId);
        history.setFileName(fileName);
        history.setModelUsed(aiModel);
        history.setEvaluationResult(result);
        history.setEvaluatedAt(LocalDateTime.now());
        historyRepository.save(history);

        return result;
    }
}