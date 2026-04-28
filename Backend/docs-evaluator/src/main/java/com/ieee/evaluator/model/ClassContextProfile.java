package com.ieee.evaluator.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "class_context_profile")
public class ClassContextProfile {

    // ── Single-row enforcement — id is always 1 ───────────────────────────────
    @Id
    @Column(name = "id")
    private Integer id = 1;

    // ── The professor's class context paragraph ───────────────────────────────
    @Column(name = "context", columnDefinition = "TEXT")
    private String context;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}