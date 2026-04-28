package com.ieee.evaluator.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "hidden_submissions")
public class HiddenSubmission {

    @Id
    @Column(name = "file_id", length = 255)
    private String fileId;

    @Column(name = "hidden_at", insertable = false, updatable = false)
    private LocalDateTime hiddenAt;
}