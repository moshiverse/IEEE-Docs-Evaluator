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
 * Orchestrates AI document analysis.
 *
 * Provider resolution order (for a given request):
 *   1. If the "model" field in the request body is a known provider key → use that provider directly.
 *   2. If model == "auto" or is null/blank → read ACTIVE_AI_PROVIDER from system_settings and route there.
 *
 * This means:
 *   • The frontend can always request a specific provider (e.g. "openai", "gemini", "openrouter").
 *   • If the frontend sends "auto", the active provider from Settings drives the choice.
 *   • All config (API keys, models) is read at request time — zero restart required.
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

    // ── Public API ────────────────────────────────────────────────────────────

    public String analyzeDocument(String fileId, String fileName, String aiModel) throws Exception {
        AiProvider provider = resolveProvider(aiModel);
        String runKey = buildRunKey(fileId, provider.getProviderName());

        if (!inFlightAnalyses.add(runKey)) {
            throw new IllegalStateException(
                "An evaluation is already in progress for this file and provider. Please wait for it to finish.");
        }

        try {
            String result = analyzeWithRetry(fileId, fileName, provider);
            persistHistory(fileId, fileName, provider.getProviderName(), result);
            return result;
        } finally {
            inFlightAnalyses.remove(runKey);
        }
    }

    // ── Retry logic ───────────────────────────────────────────────────────────

    private String analyzeWithRetry(String fileId, String fileName, AiProvider provider) throws Exception {
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
                return analyzeOnce(fileId, fileName, provider);
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

    private String analyzeOnce(String fileId, String fileName, AiProvider provider) throws Exception {
        if (provider instanceof DriveAwareAiProvider driveAware) {
            return driveAware.analyzeFromDrive(fileId, fileName);
        }

        GoogleDocsService.DocumentData docData = docsService.extractDocumentContent(fileId, MAX_PAGES_TO_RENDER);

        if (docData.text() == null || docData.text().isBlank()) {
            return "EVALUATION ERROR: No readable text found in this document. " +
                   "Please ensure the document contains text content.";
        }

        return provider.analyze(docData.text(), docData.images());
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

    private void persistHistory(String fileId, String fileName, String modelUsed, String result) {
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