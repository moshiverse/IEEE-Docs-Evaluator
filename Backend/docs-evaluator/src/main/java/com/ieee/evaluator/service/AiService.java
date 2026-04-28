package com.ieee.evaluator.service;

import com.ieee.evaluator.model.AnalysisResultDTO;
import com.ieee.evaluator.model.EvaluationHistory;
import com.ieee.evaluator.repository.EvaluationHistoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class AiService {

    private static final String KEY_ACTIVE_PROVIDER           = "ACTIVE_AI_PROVIDER";
    private static final String DEFAULT_PROVIDER              = "openai";
    private static final int    MAX_PAGES_TO_RENDER           = 999;
    private static final long   RECENT_HISTORY_WINDOW_SECONDS = 120;
    private static final int    ANALYZE_MAX_ATTEMPTS          = 8;
    private static final long   RETRY_INITIAL_DELAY_MIN_MS    = 2_000;
    private static final long   RETRY_INITIAL_DELAY_MAX_MS    = 5_000;
    private static final long   RETRY_BACKOFF_MAX_DELAY_MS    = 30_000;
    private static final long   RETRY_TIME_LIMIT_MS           = 180_000;

    private final GoogleDocsService           docsService;
    private final EvaluationHistoryRepository historyRepository;
    private final SystemSettingService        settingsService;
    private final Map<String, AiProvider>     providers;
    private final Set<String>                 inFlightAnalyses = ConcurrentHashMap.newKeySet();

    public AiService(
            GoogleDocsService docsService,
            EvaluationHistoryRepository historyRepository,
            SystemSettingService settingsService,
            List<AiProvider> providerList) {

        this.docsService       = docsService;
        this.historyRepository = historyRepository;
        this.settingsService   = settingsService;
        this.providers         = providerList.stream()
                .collect(Collectors.toMap(
                    p -> p.getProviderName().toLowerCase(),
                    Function.identity()
                ));

        log.info("AiService initialised with providers: {}", this.providers.keySet());
    }

    @Transactional(readOnly = true)
    public EvaluationHistory getFullHistoryItem(Long id) {
        EvaluationHistory history = historyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Evaluation record not found"));
        if (history.getExtractedImages() != null) {
            history.getExtractedImages().size();
        }
        return history;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public AnalysisResultDTO analyzeDocument(
            String fileId, String fileName, String aiModel, String customInstructions) throws Exception {

        AiProvider provider = resolveProvider(aiModel);
        String runKey = buildRunKey(fileId, provider.getProviderName());

        if (!inFlightAnalyses.add(runKey)) {
            throw new IllegalStateException(
                "An evaluation is already in progress for this file and provider. Please wait for it to finish.");
        }

        try {
            AnalysisResultDTO result = analyzeWithRetry(fileId, fileName, provider, customInstructions);
            persistHistory(fileId, fileName, provider.getProviderName(), result.getAnalysis(), result.getImages());
            return result;
        } finally {
            inFlightAnalyses.remove(runKey);
        }
    }

    // ── Retry logic ───────────────────────────────────────────────────────────

    private AnalysisResultDTO analyzeWithRetry(
            String fileId, String fileName, AiProvider provider, String customInstructions) throws Exception {

        Exception lastError = null;
        long startedAt = System.currentTimeMillis();

        for (int attempt = 1; attempt <= ANALYZE_MAX_ATTEMPTS; attempt++) {
            if (attempt > 1) {
                long delayMs = computeRetryDelayWithJitterMs(attempt);
                long elapsed  = System.currentTimeMillis() - startedAt;
                if (elapsed + delayMs > RETRY_TIME_LIMIT_MS) {
                    throw new IllegalStateException(
                        "EVALUATION ERROR: Retry time limit exceeded (3 minutes). Please try again.", lastError);
                }
                sleepBeforeRetry(delayMs);
            }

            try {
                return analyzeOnce(fileId, fileName, provider, customInstructions);
            } catch (Exception e) {
                lastError = e;
                long elapsed = System.currentTimeMillis() - startedAt;

                log.warn("Document evaluation failed for fileId={} provider={} on attempt {}/{}: {}",
                    fileId, provider.getProviderName(), attempt, ANALYZE_MAX_ATTEMPTS, e.getMessage());

                if (elapsed >= RETRY_TIME_LIMIT_MS) {
                    throw new IllegalStateException(
                        "EVALUATION ERROR: Retry time limit exceeded (3 minutes). Please try again.", e);
                }

                if (attempt == ANALYZE_MAX_ATTEMPTS) throw e;
            }
        }

        throw lastError != null ? lastError
            : new IllegalStateException("EVALUATION ERROR: All retry attempts exhausted.");
    }

    private long computeRetryDelayWithJitterMs(int attempt) {
        int retryNumber  = attempt - 1;
        int growthPower  = Math.min(Math.max(0, retryNumber - 1), 20);

        long exponentialUpperBound = RETRY_INITIAL_DELAY_MAX_MS * (1L << growthPower);
        long jitterUpperBound      = Math.min(exponentialUpperBound, RETRY_BACKOFF_MAX_DELAY_MS);
        long jitterLowerBound      = Math.min(RETRY_INITIAL_DELAY_MIN_MS, jitterUpperBound);

        return ThreadLocalRandom.current().nextLong(jitterLowerBound, jitterUpperBound + 1);
    }

    private void sleepBeforeRetry(long delayMs) {
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("EVALUATION ERROR: Retry interrupted.", ie);
        }
    }

    private AnalysisResultDTO analyzeOnce(
            String fileId, String fileName, AiProvider provider, String customInstructions) throws Exception {

        if (provider instanceof DriveAwareAiProvider driveAware) {
            String result = driveAware.analyzeFromDrive(fileId, fileName);
            return new AnalysisResultDTO(result, List.of());
        }

        GoogleDocsService.DocumentData docData = docsService.extractDocumentContent(fileId, MAX_PAGES_TO_RENDER);

        if (docData.text() == null || docData.text().isBlank()) {
            return new AnalysisResultDTO(
                "EVALUATION ERROR: No readable text found in this document. Please ensure the document contains text content.",
                List.of()
            );
        }

        // Pass a structured findings summary instead of the full previous evaluation text.
        // This keeps token usage flat regardless of how many revision cycles have occurred.
        String previousFindings = historyRepository
                .findTopByFileIdOrderByEvaluatedAtDesc(fileId)
                .map(prev -> extractFindingsSummary(prev.getEvaluationResult()))
                .orElse(null);

        String analysis = provider.analyze(docData.text(), docData.images(), previousFindings, customInstructions);

        return new AnalysisResultDTO(analysis, docData.images());
    }

    // ── Structured findings summary ───────────────────────────────────────────

    /**
     * Extracts a compact findings summary from a previous evaluation result.
     *
     * Pulls only the sections that matter for revision comparison:
     * Overall Score, Weaknesses, Missing Sections, and Recommendations.
     * Everything else (full rubric justifications, diagram analysis, strengths)
     * is omitted to keep the token footprint flat across revision cycles.
     *
     * Returns null if the text is blank, signalling "first evaluation".
     */
    private String extractFindingsSummary(String fullEvaluation) {
        if (fullEvaluation == null || fullEvaluation.isBlank()) return null;

        StringBuilder summary = new StringBuilder();
        summary.append("=== PREVIOUS EVALUATION FINDINGS SUMMARY ===\n\n");

        appendSection(summary, fullEvaluation, "Overall Score");
        appendSection(summary, fullEvaluation, "Missing Sections");
        appendSection(summary, fullEvaluation, "Weaknesses");
        appendSection(summary, fullEvaluation, "Recommendations");

        String result = summary.toString().trim();
        return result.isBlank() ? fullEvaluation : result;
    }

    /**
     * Finds a named section in the evaluation text and appends it to the summary builder.
     * Stops at the next section header or end of string.
     */
    private void appendSection(StringBuilder out, String text, String sectionName) {
        int start = findSectionStart(text, sectionName);
        if (start == -1) return;

        int end = findNextSectionStart(text, start + sectionName.length());
        String content = end == -1
            ? text.substring(start).trim()
            : text.substring(start, end).trim();

        if (!content.isBlank()) {
            out.append(content).append("\n\n");
        }
    }

    private int findSectionStart(String text, String sectionName) {
        // Match section headings regardless of surrounding markdown (**, ##, etc.)
        String lower  = text.toLowerCase();
        String target = sectionName.toLowerCase();
        int idx = lower.indexOf(target);
        if (idx == -1) return -1;
        // Walk back to start of line
        while (idx > 0 && text.charAt(idx - 1) != '\n') idx--;
        return idx;
    }

    private int findNextSectionStart(String text, int fromIndex) {
        // Known section headers used in the output format
        String[] headers = {
            "Diagram Analysis", "Missing Sections", "Weaknesses",
            "Recommendations", "Strengths", "Summary", "Conclusion",
            "Rubric Evaluation", "Revision Analysis"
        };
        int earliest = -1;
        String lower = text.toLowerCase();
        for (String header : headers) {
            int idx = lower.indexOf(header.toLowerCase(), fromIndex);
            if (idx != -1 && (earliest == -1 || idx < earliest)) {
                earliest = idx;
            }
        }
        return earliest;
    }

    // ── Provider resolution ───────────────────────────────────────────────────

    private AiProvider resolveProvider(String aiModel) {
        String key = (aiModel == null || aiModel.isBlank() || "auto".equalsIgnoreCase(aiModel))
                     ? activeProviderFromDb()
                     : aiModel.toLowerCase();

        if ("gpt".equals(key)) key = DEFAULT_PROVIDER;

        AiProvider provider = providers.get(key);

        if (provider == null) {
            provider = providers.get(activeProviderFromDb());
        }

        if (provider == null) {
            throw new IllegalStateException(
                "No AI provider found for key '" + aiModel + "'. " +
                "Available providers: " + providers.keySet() + ". " +
                "Please check ACTIVE_AI_PROVIDER in System Settings.");
        }

        log.info("Resolved AI provider: {} (requested: {})", provider.getProviderName(), aiModel);
        return provider;
    }

    private String activeProviderFromDb() {
        try {
            String val = settingsService.getValueOrNull(KEY_ACTIVE_PROVIDER);
            return (val != null && !val.isBlank()) ? val.toLowerCase().trim() : DEFAULT_PROVIDER;
        } catch (Exception e) {
            log.warn("Could not read ACTIVE_AI_PROVIDER from DB, defaulting to '{}': {}", DEFAULT_PROVIDER, e.getMessage());
            return DEFAULT_PROVIDER;
        }
    }

    private String buildRunKey(String fileId, String providerName) {
        String safeFileId   = fileId == null ? "" : fileId.trim();
        String safeProvider = providerName == null ? "" : providerName.trim().toLowerCase();
        return safeFileId + "|" + safeProvider;
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    private void persistHistory(String fileId, String fileName, String modelUsed, String result, List<String> images) {
        try {
            LocalDateTime now     = LocalDateTime.now();
            EvaluationHistory history = historyRepository
                .findTopByFileIdAndModelUsedOrderByEvaluatedAtDesc(fileId, modelUsed)
                .filter(existing -> isRecent(existing.getEvaluatedAt(), now))
                .orElseGet(EvaluationHistory::new);

            boolean isNew = history.getId() == null;

            history.setFileId(fileId);
            history.setFileName(fileName);
            history.setModelUsed(modelUsed);
            history.setEvaluationResult(result);
            history.setEvaluatedAt(now);
            history.setExtractedImages(images);

            if (isNew) {
                history.setIsSent(false);
                history.setTeacherFeedback(null);
                history.setIsDeleted(false);

                // Compute next version: max existing version for this fileId + 1
                int maxVersion = historyRepository.findMaxVersionByFileId(fileId);
                history.setVersion(maxVersion + 1);
            }

            historyRepository.save(history);

            log.info("Persisted evaluation for fileId={} version={}", fileId, history.getVersion());
        } catch (Exception e) {
            log.error("Failed to persist evaluation history for fileId={}: {}", fileId, e.getMessage(), e);
        }
    }

    private boolean isRecent(LocalDateTime evaluatedAt, LocalDateTime now) {
        if (evaluatedAt == null || now == null) return false;
        long diff = Math.abs(ChronoUnit.SECONDS.between(evaluatedAt, now));
        return diff <= RECENT_HISTORY_WINDOW_SECONDS;
    }
}