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

    // Only returns non-deleted records — includes version
    @Query("SELECT new com.ieee.evaluator.model.EvaluationHistorySummaryDTO(" +
           "h.id, h.fileId, h.fileName, h.modelUsed, h.evaluatedAt, h.isSent, h.version) " +
           "FROM EvaluationHistory h " +
           "WHERE h.isDeleted = false " +
           "ORDER BY h.evaluatedAt DESC")
    List<EvaluationHistorySummaryDTO> findAllSummaries();

    // Only returns non-deleted sent records for a given group code — includes version
    @Query("SELECT new com.ieee.evaluator.model.EvaluationHistorySummaryDTO(" +
           "h.id, h.fileId, h.fileName, h.modelUsed, h.evaluatedAt, h.isSent, h.version) " +
           "FROM EvaluationHistory h " +
           "WHERE h.isSent = true " +
           "AND h.isDeleted = false " +
           "AND LOWER(h.fileName) LIKE LOWER(CONCAT('%', :groupCode, '%')) " +
           "ORDER BY h.evaluatedAt DESC")
    List<EvaluationHistorySummaryDTO> findStudentSummaries(@Param("groupCode") String groupCode);

    List<EvaluationHistory> findByIsSentTrueAndFileNameContainingIgnoreCaseOrderByEvaluatedAtDesc(String groupCode);

    // Used in analyzeOnce() to get the previous evaluation for revision context
    Optional<EvaluationHistory> findTopByFileIdOrderByEvaluatedAtDesc(String fileId);

    // Used in persistHistory() to upsert instead of creating duplicates
    Optional<EvaluationHistory> findTopByFileIdAndModelUsedOrderByEvaluatedAtDesc(String fileId, String modelUsed);

    // Used in persistHistory() to compute the next version number
    @Query("SELECT COALESCE(MAX(h.version), 0) FROM EvaluationHistory h WHERE h.fileId = :fileId")
    int findMaxVersionByFileId(@Param("fileId") String fileId);
}