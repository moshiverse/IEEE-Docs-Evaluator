package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class SddPromptService {

    public String rubricSection() {
        return """
            For SDD (IEEE 1016):
            * System Architecture
            * Data Design
            * Component Design
            * Interface Design
            * Design Decisions
            """;
    }

    public String diagramAnalysisSection() {
        return """
            You have been provided with rendered page images of this document labeled as [IMG-1], [IMG-2], etc.
            For EVERY diagram, figure, or table visible in these images, you MUST:

            1. IDENTIFY the diagram type precisely:
               - UML: Class, Sequence, Component, Deployment, State, Activity
               - ERD (Entity-Relationship Diagram)
               - Architecture Diagram
               - Any other diagram type present

            2. ANALYZE the technical notation in detail with SDD-specific focus:
               - Class diagram relationships:
                 * Association (solid line, no arrowhead or filled arrowhead)
                 * Aggregation (solid line, HOLLOW diamond at the whole end)
                 * Composition (solid line, FILLED diamond at the whole end)
                 * Inheritance/Generalization (solid line, HOLLOW triangle arrowhead at parent)
                 * Dependency (DASHED line, open arrowhead)
                 * Realization/Implementation (DASHED line, HOLLOW triangle arrowhead)
               - Multiplicity labels: verify 1, 0..1, 1..*, 0..*, and custom ranges
                 are present on both ends of associations where required
               - ERD: crow's foot notation correctness, PK/FK labels, weak entities,
                 identifying vs non-identifying relationships
               - Sequence diagrams: lifelines, activation bars, synchronous messages
                 (filled arrowhead), asynchronous messages (open arrowhead),
                 return messages (dashed line)
               - Component/Deployment: interfaces, provided vs required notation,
                 node stereotypes

            3. EVALUATE correctness and completeness:
               - Are aggregation and composition diamonds used correctly and not
                 interchanged?
               - Are inheritance arrows pointing in the correct direction (child to parent)?
               - Are multiplicities present and semantically correct for the domain?
               - Do class diagrams align with the component design described in the text?
               - Are sequence diagrams consistent with the interface design section?
               - Are there orphaned classes, missing relationships, or broken associations?

            4. REPORT findings under "Diagram Analysis" in the output.
               Use this format for each diagram found:

               * [IMG-X] - <Diagram Type>:
                 - Notation observed: <specific symbols, relationship types, and labels found>
                 - Correctness: <assessment of whether notation is used properly>
                 - Issues: <specific errors, missing elements, or inconsistencies>
                 - Alignment: <whether the diagram matches the written design sections>

            If no diagrams or figures are detected in the images, output exactly "None detected."
            """;
    }
}