package com.ieee.evaluator.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "prompt_templates")
public class PromptTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Template identity ─────────────────────────────────────────────────────
    @Column(nullable = false)
    private String name;

    // ── The actual instructions injected into the custom instructions field ───
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}