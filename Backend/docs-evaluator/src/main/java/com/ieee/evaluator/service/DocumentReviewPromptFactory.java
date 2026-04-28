package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class DocumentReviewPromptFactory {

    private final DocumentTypeDetectorService  detectorService;
    private final PromptSharedRulesService     sharedRulesService;
    private final ProfessorDocProfileService   profileService;
    private final ClassContextProfileService   classContextService;
    private final SrsPromptService             srsPromptService;
    private final SddPromptService             sddPromptService;
    private final SpmpPromptService            spmpPromptService;
    private final StdPromptService             stdPromptService;

    public DocumentReviewPromptFactory(
        DocumentTypeDetectorService  detectorService,
        PromptSharedRulesService     sharedRulesService,
        ProfessorDocProfileService   profileService,
        ClassContextProfileService   classContextService,
        SrsPromptService             srsPromptService,
        SddPromptService             sddPromptService,
        SpmpPromptService            spmpPromptService,
        StdPromptService             stdPromptService
    ) {
        this.detectorService     = detectorService;
        this.sharedRulesService  = sharedRulesService;
        this.profileService      = profileService;
        this.classContextService = classContextService;
        this.srsPromptService    = srsPromptService;
        this.sddPromptService    = sddPromptService;
        this.spmpPromptService   = spmpPromptService;
        this.stdPromptService    = stdPromptService;
    }

    public String buildPrompt(String documentContent, String previousEvaluation, String customInstructions) {
        DocumentType type       = detectorService.detect(documentContent);
        String       docTypeKey = type.name();

        // ── Rubric section: DB override → hardcoded default ───────────────────
        String rubricSection = resolveRubric(type, docTypeKey);

        // ── Diagram section: DB override → hardcoded default ──────────────────
        String diagramSection = resolveDiagram(type, docTypeKey);

        // ── Class context: from DB, null if not configured ────────────────────
        String classContext = classContextService.getContext();

        return sharedRulesService.buildPrompt(
                type,
                rubricSection,
                diagramSection,
                classContext,
                documentContent,
                previousEvaluation,
                customInstructions);
    }

    // ── Resolution helpers ────────────────────────────────────────────────────

    private String resolveRubric(DocumentType type, String docTypeKey) {
        String override = profileService.getRubricOverride(docTypeKey);
        if (override != null) return override;

        return switch (type) {
            case SRS     -> srsPromptService.rubricSection();
            case SDD     -> sddPromptService.rubricSection();
            case SPMP    -> spmpPromptService.rubricSection();
            case STD     -> stdPromptService.rubricSection();
            case UNKNOWN -> """
                If document type is unknown, evaluate against the closest matching IEEE software document structure,
                but clearly identify missing sections and keep scoring strict.
                """;
        };
    }

    private String resolveDiagram(DocumentType type, String docTypeKey) {
        String override = profileService.getDiagramOverride(docTypeKey);
        if (override != null) return override;

        return switch (type) {
            case SRS     -> srsPromptService.diagramAnalysisSection();
            case SDD     -> sddPromptService.diagramAnalysisSection();
            case SPMP    -> spmpPromptService.diagramAnalysisSection();
            case STD     -> stdPromptService.diagramAnalysisSection();
            case UNKNOWN -> """
                For EVERY diagram, figure, or table visible in the provided page images, identify
                the diagram type, analyze the notation used, evaluate correctness against the closest
                matching IEEE document standard, and report findings under "Diagram Analysis".
                Use the format: * [IMG-X] - <Diagram Type>: with sub-bullets for Notation observed,
                Correctness, Issues, and Alignment.
                If no diagrams are detected, output exactly "None detected."
                """;
        };
    }
}