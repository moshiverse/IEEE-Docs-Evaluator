package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class PromptSharedRulesService {

    public String buildPrompt(DocumentType detectedType, String rubricSection, String documentContent) {
        String truncatedContent = documentContent;

        return """
            You are an expert evaluator of software engineering documents following IEEE standards.

            STEP 1 - Identify the document type:
            * SRS (IEEE 830 Software Requirements Specification)
            * SDD (IEEE 1016 Software Design Description)
            * SPMP (IEEE 1058 Software Project Management Plan)
            * STD (IEEE 829 Software Test Documentation)

            Detected Type Hint from pre-classifier: %s

            If the document is empty, unreadable, or not a software engineering document, reply exactly:
            ERROR: Invalid Software Engineering document.

            STEP 1.5 - Always extract these document details before evaluation:
            * Is the Document Empty?
            * Document Type
            * Document Title
            * Name of Members
            * Chapter Breakdown (per section heading)

            STEP 1.7 - Evaluate diagrams if present:
            * Clarity and notation adherence
            * Completeness relative to context
            * Proper labeling
            * Alignment with requirements/design
            * Usefulness for stakeholder understanding
            * For UML/use-case/activity/DFD-style figures, verify whether symbols and objects are semantically correct for the diagram type.
            * If images are provided, use them directly. Do NOT ignore images.
            * If a diagram is blurry/partial, state this explicitly as a limitation.

            STEP 2 - Evaluate using the rubric for the detected document type:
            %s

            STEP 3 - Score each criterion 1-5 (1=Poor/Missing, 5=Excellent).

            STEP 3.5 - Be concrete and evidence-based:
            * For every rubric criterion, cite at least one concrete evidence item from the document.
            * Evidence must reference either a section heading or image/page marker (e.g., [IMG-2], "3.2 Functional Requirements").
            * If content is missing, explicitly write "No evidence found".
            * Never output only generic summaries.

            STEP 4 - Output EXACTLY in this format:

            Is the Document Empty?: <Yes/No>
            Document Title: <title or Not specified>
            Name of Members: <names or Not specified>
            Chapter Breakdown:
            * <Chapter/Section 1>
            * <etc.>

            Document Type: <Detected Type>
            Overall Score: X/25

            Summary:
            * (2-3 bullet points)

            Rubric Evaluation:
            * <Criterion 1>: X/5 - (short justification)
                            Evidence: <specific section heading, quote fragment, or [IMG-x]>
            * <Criterion 2>: X/5 - (short justification)
                            Evidence: <specific section heading, quote fragment, or [IMG-x]>
            * <Criterion 3>: X/5 - (short justification)
                            Evidence: <specific section heading, quote fragment, or [IMG-x]>
            * <Criterion 4>: X/5 - (short justification)
                            Evidence: <specific section heading, quote fragment, or [IMG-x]>
            * <Criterion 5>: X/5 - (short justification)
                            Evidence: <specific section heading, quote fragment, or [IMG-x]>

                        Diagram Evaluation:
                        * Diagram Presence: PRESENT/MISSING/INCOMPLETE - <reason>
                        * Symbol/Object Correctness: PRESENT/MISSING/INCOMPLETE - <reason with [IMG-x] evidence>
                        * Labeling and Readability: PRESENT/MISSING/INCOMPLETE - <reason>
                        * Consistency with Text Requirements: PRESENT/MISSING/INCOMPLETE - <reason>
                        * Diagram Coverage Adequacy: PRESENT/MISSING/INCOMPLETE - <reason>

            Strengths:
            * (2-3 bullet points)

            Weaknesses:
            * (2-3 bullet points)

            Missing or Incomplete Sections:
            * (list specific missing parts, if any)

            Recommendations:
            * (2-3 actionable improvements)

            Conclusion:
            * (overall quality judgment)

            IMPORTANT: Be strict and realistic. Do NOT inflate scores. Do not hallucinate sections.
            IMPORTANT: If there is insufficient evidence, lower the score and say exactly what evidence is missing.

            DOCUMENT:
            %s
            """.formatted(detectedType.name(), rubricSection, truncatedContent);
    }

    private String truncate(String text, int maxChars) {
        if (text == null) {
            return "";
        }
        return text.length() > maxChars ? text.substring(0, maxChars) + "...[truncated]" : text;
    }
}
