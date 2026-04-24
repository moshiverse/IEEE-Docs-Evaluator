package com.ieee.evaluator.repository;

import com.ieee.evaluator.model.EvaluationHistory;
import com.ieee.evaluator.model.EvaluationHistorySummaryDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvaluationHistoryRepository extends JpaRepository<EvaluationHistory, Long> {

    // Constructor expression — only selects the 6 lightweight columns, never touches
    // the extractedImages or evaluationResult columns. Keeps the dashboard query fast.
    @Query("SELECT new com.ieee.evaluator.model.EvaluationHistorySummaryDTO(" +
           "h.id, h.fileId, h.fileName, h.modelUsed, h.evaluatedAt, h.isSent) " +
           "FROM EvaluationHistory h ORDER BY h.evaluatedAt DESC")
    List<EvaluationHistorySummaryDTO> findAllSummaries();

    @Query("SELECT new com.ieee.evaluator.model.EvaluationHistorySummaryDTO(" +
       "h.id, h.fileId, h.fileName, h.modelUsed, h.evaluatedAt, h.isSent) " +
       "FROM EvaluationHistory h " +
       "WHERE h.isSent = true AND LOWER(h.fileName) LIKE LOWER(CONCAT('%', :groupCode, '%')) " +
       "ORDER BY h.evaluatedAt DESC")
    List<EvaluationHistorySummaryDTO> findStudentSummaries(@Param("groupCode") String groupCode);

    List<EvaluationHistory> findByIsSentTrueAndFileNameContainingIgnoreCaseOrderByEvaluatedAtDesc(String groupCode);

    // Used in analyzeOnce() to pass the last result as context to the AI
    Optional<EvaluationHistory> findTopByFileIdOrderByEvaluatedAtDesc(String fileId);

    // Used in persistHistory() to upsert instead of creating duplicates
    Optional<EvaluationHistory> findTopByFileIdAndModelUsedOrderByEvaluatedAtDesc(String fileId, String modelUsed);
}