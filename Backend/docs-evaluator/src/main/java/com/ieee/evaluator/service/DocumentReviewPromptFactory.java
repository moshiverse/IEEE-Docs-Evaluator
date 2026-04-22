package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class DocumentReviewPromptFactory {

    private final DocumentTypeDetectorService detectorService;
    private final PromptSharedRulesService sharedRulesService;
    private final SrsPromptService srsPromptService;
    private final SddPromptService sddPromptService;
    private final SpmpPromptService spmpPromptService;
    private final StdPromptService stdPromptService;

    public DocumentReviewPromptFactory(
        DocumentTypeDetectorService detectorService,
        PromptSharedRulesService sharedRulesService,
        SrsPromptService srsPromptService,
        SddPromptService sddPromptService,
        SpmpPromptService spmpPromptService,
        StdPromptService stdPromptService
    ) {
        this.detectorService = detectorService;
        this.sharedRulesService = sharedRulesService;
        this.srsPromptService = srsPromptService;
        this.sddPromptService = sddPromptService;
        this.spmpPromptService = spmpPromptService;
        this.stdPromptService = stdPromptService;
    }

    public String buildPrompt(String documentContent, String previousEvaluation, String customInstructions) {
        DocumentType type = detectorService.detect(documentContent);

        String rubricSection = switch (type) {
            case SRS -> srsPromptService.rubricSection();
            case SDD -> sddPromptService.rubricSection();
            case SPMP -> spmpPromptService.rubricSection();
            case STD -> stdPromptService.rubricSection();
            case UNKNOWN -> """
                If document type is unknown, evaluate against the closest matching IEEE software document structure,
                but clearly identify missing sections and keep scoring strict.
                """;
        };

        return sharedRulesService.buildPrompt(type, rubricSection, documentContent, previousEvaluation, customInstructions);
    }
}
