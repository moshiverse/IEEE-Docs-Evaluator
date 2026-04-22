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

    // FIX #5 (optional): Add a dedicated groupCode column to avoid filtering
    // by fileName LIKE %groupCode%. Uncomment + add a DB migration if adopted.
    // private String groupCode;

    private String modelUsed;

    @Column(columnDefinition = "TEXT")
    private String evaluationResult;

    private LocalDateTime evaluatedAt;

    @Column(columnDefinition = "TEXT")
    private String teacherFeedback;

    @Column(name = "is_sent", columnDefinition = "boolean default false")
    private Boolean isSent = false;

    // FIX #2: Added FetchType.EAGER to prevent LazyInitializationException
    // when extractedImages is accessed outside of an active transaction
    // (e.g., during JSON serialization in the controller).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "evaluation_images", joinColumns = @JoinColumn(name = "history_id"))
    @Column(name = "image_data", columnDefinition = "TEXT")
    private List<String> extractedImages;
}