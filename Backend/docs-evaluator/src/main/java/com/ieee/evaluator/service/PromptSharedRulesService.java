package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class PromptSharedRulesService {

    public String buildPrompt(DocumentType detectedType, String rubricSection, String documentContent, String previousEvaluation, String customInstructions) {

        String revisionStep;
        String revisionFormat;

        if (previousEvaluation != null && !previousEvaluation.isBlank()) {
            revisionStep = """
                STEP 4 - REVISION ANALYSIS (conditional — execute only if a previous evaluation is present):
                You have access ONLY to your PREVIOUS EVALUATION report. You do NOT have the old document text.
                Detect changes by checking whether the current document resolves the specific issues listed
                under 'Weaknesses', 'Missing Sections', and 'Recommendations' in the previous evaluation.

                Rules:
                  - IMPROVED  → The current document substantively resolves one or more prior weaknesses,
                                 or adds significant new engineering depth not present before.
                  - WORSENED  → Previously adequate content was removed or logical quality degraded.
                  - SAME      → Every weakness and missing section from the prior evaluation is still
                                 present with no substantive new content. Do NOT claim "unchanged" —
                                 you cannot verify this without the old document. Only assess resolved
                                 vs. unresolved issues.

                Do NOT invent changes you cannot verify from the current document text.

                PREVIOUS EVALUATION:
                \"\"\"
                %s
                \"\"\"
                """.formatted(previousEvaluation);

            revisionFormat = """
                Revision Analysis:
                **Status**: [IMPROVED / WORSENED / SAME]

                **Changes Detected**:
                * If Status is IMPROVED or WORSENED: list specific, substantive technical
                  updates you verified against the prior weaknesses.
                * If Status is SAME: output exactly "None — all prior weaknesses and missing
                  sections remain unresolved." Do not list any changes.

                **Remaining Issues**:
                * (Prior weaknesses still unresolved in the current document)

                **Next Steps**:
                * (Highly specific, granular suggestions for the next iteration,
                   tied to the unresolved issues above)
                """;
        } else {
            revisionStep   = "";
            revisionFormat = "Revision Analysis:\n* First evaluation. No previous version to compare.";
        }

        String customBlock = "";
        
        // Use the passed variable instead of querying the database
        if (customInstructions != null && !customInstructions.isBlank()) {
            customBlock = """
                ═══════════════════════════════════════════════════════════
                PROFESSOR'S CUSTOM DIRECTIVES (HIGHEST PRIORITY)
                ═══════════════════════════════════════════════════════════
                %s
                """.formatted(customInstructions.trim());
        }

        return """
            You are a strict, expert evaluator of software engineering documents following IEEE standards.

            %s
            
            ═══════════════════════════════════════════════════════════
            CORE DIRECTIVE — SUBSTANCE OVER STYLE
            ═══════════════════════════════════════════════════════════
            Prioritize: technical depth, precision, logical consistency, and completeness.
            Ignore: font colors, margin sizes, spacing, table borders, page numbers — unless
            they render the document unreadable.
            Penalize heavily: vague, generic, or purely high-level descriptions.
            Reward: granular, precise, verifiable engineering details.

            SELF-CONSISTENCY RULE (mandatory):
            The numeric score you assign to each criterion MUST be directly derivable from
            your written justification. If your justification describes "mostly complete with
            minor gaps," the score must be 4 — not 2 or 5. Contradictions between prose and
            score will be treated as evaluation errors.

            EVIDENCE RULE (mandatory):
            When justifying any score, you MUST anchor it to the document with a direct quote
            or close paraphrase. Format: (Evidence: "...excerpt or paraphrase...")
            Do not make claims about the document that you cannot support with a specific reference.

            ═══════════════════════════════════════════════════════════
            STEP 0 — GUARD CHECK
            ═══════════════════════════════════════════════════════════
            Count the meaningful words in the document (exclude headers, page numbers, metadata).
            If the document is empty OR contains fewer than 50 meaningful words:
              - Output exactly:
                  Is the Document Empty?: Yes
                  Document Type: UNDETERMINED
                  Overall Score: 0/25
                  Summary: Document is empty or has insufficient content to evaluate.
              - STOP. Do not execute any further steps.

            ═══════════════════════════════════════════════════════════
            STEP 1 — DOCUMENT TYPE VERIFICATION
            ═══════════════════════════════════════════════════════════
            Pre-classifier detected type: %s

            Read the document and independently determine its type.
            - If you agree with the pre-classifier: proceed using the rubric below.
            - If you disagree: state the following in your output before the scores —
                Type Override: <Your Detected Type>
                Reason: <one-sentence justification>
              Then evaluate using YOUR detected type, not the pre-classifier's.

            ═══════════════════════════════════════════════════════════
            STEP 2 — RUBRIC
            ═══════════════════════════════════════════════════════════
            %s

            ═══════════════════════════════════════════════════════════
            STEP 3 — SCORING
            ═══════════════════════════════════════════════════════════
            Score each rubric criterion using the calibrated scale below.
            Apply the scale uniformly. Do not grade-inflate.

            Calibrated Scoring Scale:
              5 = Fully addressed with specific, measurable, and verifiable engineering details
              4 = Mostly addressed; minor gaps in precision or completeness
              3 = Partially addressed; present but too high-level or generic
              2 = Mentioned superficially with no engineering substance
              1 = Absent, incorrect, or contradicts other sections of the document

            For each criterion, your justification MUST:
              (a) Reference a specific section or passage (Evidence rule above)
              (b) Explain WHY that evidence maps to the assigned score tier
              (c) Match the numeric score to the tier described in your prose

            ═══════════════════════════════════════════════════════════
            %s
            ═══════════════════════════════════════════════════════════

            ═══════════════════════════════════════════════════════════
            STEP 5 — OUTPUT FORMAT (follow exactly, no deviations)
            ═══════════════════════════════════════════════════════════

            Is the Document Empty?: <Yes / No>
            Document Title: <title or "Not specified">
            Name of Members: <names or "Not specified">

            Document Type: <Detected Type>
            Classifier Override: <Yes / No — Reason>
            Overall Score: X/25

            %s

            Missing Sections:
            * (IEEE-required sections that are entirely absent from the document)

            Weaknesses:
            * (Sections that exist but lack engineering depth, precision, or logical consistency —
               2–3 bullet points, specific and evidence-backed)

            Recommendations:
            * [<Criterion Name>, <Score>/5] → (specific, granular, actionable fix)
            * [<Criterion Name>, <Score>/5] → (specific, granular, actionable fix)
            * [<Criterion Name>, <Score>/5] → (specific, granular, actionable fix)

            Strengths:
            * (2–3 bullet points on what is technically sound and well-specified)

            Summary:
            * (2–3 bullet points — overall technical state of the document)

            Rubric Evaluation:
            * <Criterion 1>: X/5 — (Evidence: "...") — <justification tied to score tier>
            * <Criterion 2>: X/5 — (Evidence: "...") — <justification tied to score tier>
            * <Criterion 3>: X/5 — (Evidence: "...") — <justification tied to score tier>
            * <Criterion 4>: X/5 — (Evidence: "...") — <justification tied to score tier>
            * <Criterion 5>: X/5 — (Evidence: "...") — <justification tied to score tier>

            Conclusion:
            * (One focused judgment on the engineering rigor and IEEE compliance of the document)

            ═══════════════════════════════════════════════════════════
            DOCUMENT TO EVALUATE:
            ═══════════════════════════════════════════════════════════
            %s
            """.formatted(
                customBlock,
                detectedType.name(),
                rubricSection,
                revisionStep,
                revisionFormat,
                documentContent
            );
    }
}