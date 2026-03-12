package com.ieee.evaluator.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

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
}