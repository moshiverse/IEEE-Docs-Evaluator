package com.ieee.evaluator.repository;

import com.ieee.evaluator.model.EvaluationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvaluationHistoryRepository extends JpaRepository<EvaluationHistory, Long> {
    List<EvaluationHistory> findAllByOrderByEvaluatedAtDesc();
    Optional<EvaluationHistory> findTopByFileIdOrderByEvaluatedAtDesc(String fileId);
    Optional<EvaluationHistory> findTopByFileIdAndModelUsedOrderByEvaluatedAtDesc(String fileId, String modelUsed);
    List<EvaluationHistory> findByIsSentTrueAndFileNameContainingIgnoreCaseOrderByEvaluatedAtDesc(String groupCode);
}