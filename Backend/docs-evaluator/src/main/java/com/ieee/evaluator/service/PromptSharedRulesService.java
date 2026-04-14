package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class PromptSharedRulesService {

public String buildPrompt(DocumentType detectedType, String rubricSection, String documentContent, String previousEvaluation) {
        
        String revisionInstruction = "";
        String revisionFormat = "Revision Analysis:\n* First evaluation. No previous version to compare.";

        if (previousEvaluation != null && !previousEvaluation.isBlank()) {
            revisionInstruction = """
            STEP 3.8 - REVISION ANALYSIS (CRITICAL):
            You previously evaluated an older version of this document. Compare the CURRENT document against your PREVIOUS evaluation below.
            1. Identify exactly what SUBSTANTIVE technical content was added, modified, or removed. Completely ignore cosmetic formatting changes.
            2. Determine the Status based on these strict rules:
               - Output IMPROVED if the student fixed previous technical weaknesses, added missing engineering sections, or significantly deepened the content details.
               - Output WORSENED if important engineering content was deleted or logical quality degraded.
               - Output SAME if the changes were purely cosmetic (e.g., changing colors, adjusting column widths, adding page numbers) or if no meaningful technical depth was added.
            3. Provide targeted, granular suggestions on what engineering details still need to be addressed.
            
            PREVIOUS EVALUATION TO COMPARE AGAINST:
            \"\"\"
            %s
            \"\"\"
            """.formatted(previousEvaluation);

            revisionFormat = """
            Revision Analysis:
            **Status**: [IMPROVED / WORSENED / SAME]

            **Changes Made**:
            * (List specific, substantive technical updates you detected)

            **Next Steps**:
            * (Highly specific, granular suggestions for the next iteration)
            """;
        }

        return """
            You are a strict, expert evaluator of software engineering documents following IEEE standards.
            
            CRITICAL DIRECTIVE - SUBSTANCE OVER STYLE:
            You MUST prioritize technical depth, precision, logical consistency, and completeness. Completely IGNORE superficial formatting (e.g., font colors, margin sizes, spacing, table borders, page numbers) unless it renders the document unreadable. Penalize heavily for vague, generic, or high-level descriptions. Reward granular, precise engineering details.

            STEP 1 - Identify the document type:
            Detected Type Hint from pre-classifier: %s

            STEP 2 - Evaluate using the rubric for the detected document type:
            %s

            STEP 3 - Score each criterion 1-5 (1=Poor/Missing, 5=Excellent). Be highly critical and cite concrete evidence.
            
            %s

            STEP 4 - Output EXACTLY in this format:

            Is the Document Empty?: <Yes/No>
            Document Title: <title or Not specified>
            Name of Members: <names or Not specified>
            
            Document Type: <Detected Type>
            Overall Score: X/25

            %s

            Missing or Incomplete Sections:
            * (List specific missing engineering requirements or parts)

            Recommendations:
            * (2-3 highly actionable, granular technical improvements based on the missing sections)

            Summary:
            * (2-3 bullet points overview of the technical state of the document)

            Strengths:
            * (2-3 bullet points focusing on technical depth)

            Weaknesses:
            * (2-3 bullet points focusing on vague, missing, or illogical technical details)

            Rubric Evaluation:
            * <Criterion 1>: X/5 - (Granular justification based on content, not formatting)
            * <Criterion 2>: X/5 - (Granular justification based on content, not formatting)
            * <Criterion 3>: X/5 - (Granular justification based on content, not formatting)
            * <Criterion 4>: X/5 - (Granular justification based on content, not formatting)
            * <Criterion 5>: X/5 - (Granular justification based on content, not formatting)

            Conclusion:
            * (Overall judgment on the engineering rigor of the document)

            DOCUMENT:
            %s
            """.formatted(
                detectedType.name(), 
                rubricSection, 
                revisionInstruction, 
                revisionFormat, 
                documentContent
            );
    }

    private String truncate(String text, int maxChars) {
        if (text == null) {
            return "";
        }
        return text.length() > maxChars ? text.substring(0, maxChars) + "...[truncated]" : text;
    }
}
