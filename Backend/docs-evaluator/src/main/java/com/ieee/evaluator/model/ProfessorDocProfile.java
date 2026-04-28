package com.ieee.evaluator.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "professor_doc_profiles")
public class ProfessorDocProfile {

    // ── Primary key — one row per document type ───────────────────────────────
    @Id
    @Column(name = "doc_type", length = 10)
    private String docType; // "SRS", "SDD", "SPMP", "STD"

    // ── Overrideable sections — null means use hardcoded default ──────────────
    @Column(name = "rubric_section", columnDefinition = "TEXT")
    private String rubricSection;

    @Column(name = "diagram_section", columnDefinition = "TEXT")
    private String diagramSection;

    // ── Audit ─────────────────────────────────────────────────────────────────
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}