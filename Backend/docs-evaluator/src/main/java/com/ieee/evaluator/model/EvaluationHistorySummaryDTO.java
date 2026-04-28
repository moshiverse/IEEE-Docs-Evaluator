package com.ieee.evaluator.model;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class EvaluationHistorySummaryDTO {
    private Long id;
    private String fileId;
    private String fileName;
    private String modelUsed;
    private LocalDateTime evaluatedAt;
    private Boolean isSent;
    private Integer version;
}