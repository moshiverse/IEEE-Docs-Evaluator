package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

@Service
public class SpmpPromptService {

    public String rubricSection() {
        return """
            For SPMP (IEEE 1058):
            * Project Scope and Objectives
            * Scheduling and Timeline
            * Resource Allocation
            * Risk Management
            * Monitoring and Control
            """;
    }

    public String diagramAnalysisSection() {
        return """
            You have been provided with rendered page images of this document labeled as [IMG-1], [IMG-2], etc.
            For EVERY diagram, figure, or table visible in these images, you MUST:

            1. IDENTIFY the diagram type precisely:
               - Gantt Chart
               - Work Breakdown Structure (WBS)
               - Risk Matrix / Risk Register Table
               - Timeline / Milestone Chart
               - Organizational Chart
               - Any other diagram or table type present

            2. ANALYZE the technical notation in detail with SPMP-specific focus:
               - Gantt Chart: task bars with start and end dates, dependencies between
                 tasks (arrows or lines), milestones (diamond markers), critical path
                 if indicated, resource assignments per task
               - WBS: hierarchical decomposition correctness, numbering scheme
                 (1.0, 1.1, 1.1.1 etc.), leaf nodes representing work packages,
                 no overlapping or missing deliverables
               - Risk Matrix: likelihood vs impact axes correctly labeled,
                 risk levels (Low/Medium/High/Critical) clearly mapped,
                 individual risks plotted or listed with mitigation strategies
               - Timeline/Milestones: dates present and consistent with the scheduling
                 section, phases clearly labeled

            3. EVALUATE correctness and completeness:
               - Are Gantt chart dates consistent with the project scope and timeline
                 described in the written sections?
               - Does the WBS cover all deliverables mentioned in the scope section
                 with no gaps?
               - Are risks in the risk matrix consistent with the risk management section
                 of the document?
               - Are milestones clearly defined and tied to specific deliverables?
               - Are resource assignments realistic and consistent with the resource
                 allocation section?

            4. REPORT findings under "Diagram Analysis" in the output.
               Use this format for each diagram found:

               * [IMG-X] - <Diagram Type>:
                 - Notation observed: <specific symbols, structure, and labels found>
                 - Correctness: <assessment of whether the diagram is properly constructed>
                 - Issues: <specific errors, missing elements, or inconsistencies>
                 - Alignment: <whether the diagram matches the written planning sections>

            If no diagrams or figures are detected in the images, output exactly "None detected."
            """;
    }
}