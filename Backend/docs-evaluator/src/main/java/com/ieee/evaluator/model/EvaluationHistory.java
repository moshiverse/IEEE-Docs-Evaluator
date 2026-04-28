package com.ieee.evaluator.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "evaluation_history")
public class EvaluationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileId;

    private String fileName;

    private String modelUsed;

    @Column(columnDefinition = "TEXT")
    private String evaluationResult;

    private LocalDateTime evaluatedAt;

    @Column(columnDefinition = "TEXT")
    private String teacherFeedback;

    @Column(name = "is_sent", columnDefinition = "boolean default false")
    private Boolean isSent = false;

    // ── Soft delete ───────────────────────────────────────────────────────────
    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean isDeleted = false;

    // ── Version number — 1 = first submission, 2 = first revision, etc. ──────
    @Column(name = "version", columnDefinition = "integer default 1")
    private Integer version = 1;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "evaluation_images", joinColumns = @JoinColumn(name = "history_id"))
    @Column(name = "image_data", columnDefinition = "TEXT")
    private List<String> extractedImages;
}