package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class SrsPromptService {

    public String rubricSection() {
        return """
            For SRS (IEEE 830):
            * Introduction and Scope
            * Overall Description
            * Functional Requirements
            * Non-Functional Requirements
            * External Interfaces
            """;
    }

    public String diagramAnalysisSection() {
        return """
            You have been provided with rendered page images of this document labeled as [IMG-1], [IMG-2], etc.
            For EVERY diagram, figure, or table visible in these images, you MUST:

            1. IDENTIFY the diagram type precisely:
               - Use Case Diagram
               - Context Diagram / System Context
               - Entity-Relationship Diagram (ERD)
               - Data Flow Diagram (DFD)
               - Any other diagram type present

            2. ANALYZE the technical notation in detail with SRS-specific focus:
               - Use Case notation: <<include>> (dashed arrow, mandatory relationship),
                 <<extend>> (dashed arrow, conditional relationship), actor-to-use-case
                 association lines, system boundary rectangles
               - Verify that <<include>> and <<extend>> arrows point in the correct direction:
                 <<include>> points FROM the base use case TO the included use case;
                 <<extend>> points FROM the extending use case TO the base use case
               - Actor placement: primary actors on the left, secondary actors on the right
               - ERD if present: primary keys (PK), foreign keys (FK), cardinalities,
                 crow's foot notation correctness
               - DFD if present: process bubbles, data stores, external entities,
                 data flow arrows with labels

            3. EVALUATE correctness and completeness:
               - Are all functional requirements traceable to at least one use case?
               - Are system boundaries clearly drawn and correctly scoped?
               - Are actor roles semantically correct for the described system?
               - Are <<include>> and <<extend>> relationships used appropriately
                 (not interchanged or misused)?
               - Are cardinalities and relationships logically consistent with the
                 written requirements?

            4. REPORT findings under "Diagram Analysis" in the output.
               Use this format for each diagram found:

               * [IMG-X] - <Diagram Type>:
                 - Notation observed: <specific symbols, relationship types, and labels found>
                 - Correctness: <assessment of whether notation is used properly>
                 - Issues: <specific errors, missing elements, or inconsistencies>
                 - Alignment: <whether the diagram matches the written requirements>

            If no diagrams or figures are detected in the images, output exactly "None detected."
            """;
    }
}