package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class StdPromptService {

    public String rubricSection() {
        return """
            For STD (IEEE 829):
            * Test Plan
            * Test Cases
            * Test Procedures
            * Test Coverage
            * Traceability to Requirements
            """;
    }

    public String diagramAnalysisSection() {
        return """
            You have been provided with rendered page images of this document labeled as [IMG-1], [IMG-2], etc.
            For EVERY diagram, figure, or table visible in these images, you MUST:

            1. IDENTIFY the diagram type precisely:
               - Traceability Matrix (Requirements-to-Test mapping)
               - Activity Diagram (test flow or test procedure flow)
               - State Diagram (system state under test)
               - Test Coverage Table
               - Any other diagram or table type present

            2. ANALYZE the technical notation in detail with STD-specific focus:
               - Traceability Matrix: rows mapped to requirements IDs, columns mapped
                 to test case IDs, cells indicating coverage (e.g. checkmark, X, or ID),
                 completeness of mapping (no requirement left without at least one test case)
               - Activity Diagram: initial node (filled circle), final node (bullseye),
                 action nodes (rounded rectangles), decision nodes (diamonds) with guard
                 conditions in brackets [ ], fork/join bars for parallel flows,
                 swimlanes correctly assigning actions to actors or system components
               - State Diagram: states (rounded rectangles), transitions (arrows with
                 event/condition/action labels), initial pseudostate (filled circle),
                 final state (bullseye), guard conditions in brackets
               - Test Coverage Table: coverage percentage per module or requirement,
                 pass/fail indicators, untested areas clearly identified

            3. EVALUATE correctness and completeness:
               - Does the traceability matrix cover all requirements listed in the
                 referenced SRS?
               - Are activity diagram guard conditions syntactically correct
                 (enclosed in brackets)?
               - Do activity/state diagrams have proper initial and final nodes?
               - Are swimlane assignments logically correct for the described test
                 procedures?
               - Is test coverage sufficient and are gaps explicitly acknowledged?

            4. REPORT findings under "Diagram Analysis" in the output.
               Use this format for each diagram found:

               * [IMG-X] - <Diagram Type>:
                 - Notation observed: <specific symbols, structure, and labels found>
                 - Correctness: <assessment of whether notation is used properly>
                 - Issues: <specific errors, missing elements, or inconsistencies>
                 - Alignment: <whether the diagram matches the written test sections>

            If no diagrams or figures are detected in the images, output exactly "None detected."
            """;
    }
}