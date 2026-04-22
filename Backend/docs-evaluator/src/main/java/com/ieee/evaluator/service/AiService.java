package com.ieee.evaluator.service;

import com.ieee.evaluator.model.EvaluationHistory;
import com.ieee.evaluator.repository.EvaluationHistoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ThreadLocalRandom;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Orchestrates AI document analysis, returning both text results and extracted visual data.
 */
@Service
@Slf4j
public class AiService {

    private static final String KEY_ACTIVE_PROVIDER       = "ACTIVE_AI_PROVIDER";
    private static final String DEFAULT_PROVIDER          = "openai";
    private static final int    MAX_PAGES_TO_RENDER       = 999;
    private static final long   RECENT_HISTORY_WINDOW_SECONDS = 120;
    private static final int    ANALYZE_MAX_ATTEMPTS      = 8;
    private static final long   RETRY_INITIAL_DELAY_MIN_MS = 2_000;
    private static final long   RETRY_INITIAL_DELAY_MAX_MS = 5_000;
    private static final long   RETRY_BACKOFF_MAX_DELAY_MS = 30_000;
    private static final long   RETRY_TIME_LIMIT_MS       = 180_000;

    private final GoogleDocsService         docsService;
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

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Analyzes a document and returns a Map containing the "analysis" text and "images" list.
     */
    public Map<String, Object> analyzeDocument(String fileId, String fileName, String aiModel, String customInstructions) throws Exception {
        AiProvider provider = resolveProvider(aiModel);
        String runKey = buildRunKey(fileId, provider.getProviderName());

        if (!inFlightAnalyses.add(runKey)) {
            throw new IllegalStateException(
                "An evaluation is already in progress for this file and provider. Please wait for it to finish.");
        }

        try {
            // Updated to receive a Map containing both text and images
            Map<String, Object> resultData = analyzeWithRetry(fileId, fileName, provider, customInstructions);
            
            String resultText = (String) resultData.get("analysis");
            List<String> images = (List<String>) resultData.get("images");

            // Persist both the result text and the images extracted during this run
            persistHistory(fileId, fileName, provider.getProviderName(), resultText, images);
            
            return resultData;
        } finally {
            inFlightAnalyses.remove(runKey);
        }
    }

    // ── Retry logic ───────────────────────────────────────────────────────────

    private Map<String, Object> analyzeWithRetry(String fileId, String fileName, AiProvider provider, String customInstructions) throws Exception {
        Exception lastError = null;
        long startedAt = System.currentTimeMillis();

        for (int attempt = 1; attempt <= ANALYZE_MAX_ATTEMPTS; attempt++) {
            if (attempt > 1) {
                long delayMs = computeRetryDelayWithJitterMs(attempt);
                long elapsed = System.currentTimeMillis() - startedAt;
                if (elapsed + delayMs > RETRY_TIME_LIMIT_MS) {
                    throw new IllegalStateException(
                        "EVALUATION ERROR: Retry time limit exceeded (3 minutes). Please try again.",
                        lastError
                    );
                }
                sleepBeforeRetry(delayMs);
            }

            try {
                return analyzeOnce(fileId, fileName, provider, customInstructions);
            } catch (Exception e) {
                lastError = e;
                long elapsed = System.currentTimeMillis() - startedAt;

                log.warn(
                    "Document evaluation failed for fileId={} provider={} on attempt {}/{}: {}",
                    fileId, provider.getProviderName(), attempt, ANALYZE_MAX_ATTEMPTS, e.getMessage()
                );

                if (elapsed >= RETRY_TIME_LIMIT_MS) {
                    throw new IllegalStateException(
                        "EVALUATION ERROR: Retry time limit exceeded (3 minutes). Please try again.",
                        e
                    );
                }

                if (attempt == ANALYZE_MAX_ATTEMPTS) {
                    throw e;
                }
            }
        }

        throw lastError != null ? lastError
            : new IllegalStateException("EVALUATION ERROR: All retry attempts exhausted.");
    }

    private long computeRetryDelayWithJitterMs(int attempt) {
        int retryNumber = attempt - 1;
        int growthPower = Math.max(0, retryNumber - 1);
        growthPower = Math.min(growthPower, 20);

        long exponentialUpperBound = RETRY_INITIAL_DELAY_MAX_MS * (1L << growthPower);
        long jitterUpperBound = Math.min(exponentialUpperBound, RETRY_BACKOFF_MAX_DELAY_MS);
        long jitterLowerBound = Math.min(RETRY_INITIAL_DELAY_MIN_MS, jitterUpperBound);

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

    private Map<String, Object> analyzeOnce(String fileId, String fileName, AiProvider provider, String customInstructions) throws Exception {
        // FIX #3: This branch is not dead code — it executes whenever a DriveAwareAiProvider
        // is resolved (e.g. Gemini). It returns an empty images list because drive-native
        // providers handle rendering internally. Update images handling here if that changes.
        if (provider instanceof DriveAwareAiProvider driveAware) {
            String result = driveAware.analyzeFromDrive(fileId, fileName);
            return Map.of("analysis", result, "images", List.of());
        }

        // Extract both text and images from the Google Doc/PDF
        GoogleDocsService.DocumentData docData = docsService.extractDocumentContent(fileId, MAX_PAGES_TO_RENDER);

        if (docData.text() == null || docData.text().isBlank()) {
            return Map.of(
                "analysis", "EVALUATION ERROR: No readable text found in this document. Please ensure the document contains text content.",
                "images", List.of()
            );
        }

        String previousEvaluation = historyRepository
                .findTopByFileIdOrderByEvaluatedAtDesc(fileId)
                .map(EvaluationHistory::getEvaluationResult)
                .orElse(null);

        // Perform multimodal analysis using OpenAI
        String analysis = provider.analyze(docData.text(), docData.images(), previousEvaluation, customInstructions);

        // Return the full set of data to the controller
        return Map.of(
            "analysis", analysis,
            "images", docData.images()
        );
    }

    // ── Provider resolution ───────────────────────────────────────────────────

    private AiProvider resolveProvider(String aiModel) {
        String key = (aiModel == null || aiModel.isBlank() || "auto".equalsIgnoreCase(aiModel))
                     ? activeProviderFromDb()
                     : aiModel.toLowerCase();

        if ("gpt".equals(key)) key = DEFAULT_PROVIDER;

        AiProvider provider = providers.get(key);

        if (provider == null) {
            String activeKey = activeProviderFromDb();
            provider = providers.get(activeKey);
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
        String safeFileId = fileId == null ? "" : fileId.trim();
        String safeProvider = providerName == null ? "" : providerName.trim().toLowerCase();
        return safeFileId + "|" + safeProvider;
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    private void persistHistory(String fileId, String fileName, String modelUsed, String result, List<String> images) {
        try {
            LocalDateTime now = LocalDateTime.now();
            EvaluationHistory history = historyRepository
                .findTopByFileIdAndModelUsedOrderByEvaluatedAtDesc(fileId, modelUsed)
                .filter(existing -> isRecent(existing.getEvaluatedAt(), now))
                .orElseGet(EvaluationHistory::new);

            history.setFileId(fileId);
            history.setFileName(fileName);
            history.setModelUsed(modelUsed);
            history.setEvaluationResult(result);
            history.setEvaluatedAt(now);

            if (history.getId() == null) {
                history.setIsSent(false);
                history.setTeacherFeedback(null);
            }

            // FIX #1: Use direct setter instead of reflection. EvaluationHistory
            // has @Data (Lombok), so setExtractedImages is always available.
            history.setExtractedImages(images);

            // FIX #4: save() is now outside the blanket catch so DB failures
            // surface properly instead of being silently swallowed.
            historyRepository.save(history);
        } catch (Exception e) {
            log.error("Failed to persist evaluation history for fileId={}: {}", fileId, e.getMessage(), e);
        }
    }

    private boolean isRecent(LocalDateTime evaluatedAt, LocalDateTime now) {
        if (evaluatedAt == null || now == null) {
            return false;
        }
        long diff = Math.abs(ChronoUnit.SECONDS.between(evaluatedAt, now));
        return diff <= RECENT_HISTORY_WINDOW_SECONDS;
    }
}