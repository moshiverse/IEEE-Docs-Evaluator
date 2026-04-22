package com.ieee.evaluator.service;

import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;

@Service
public class DocumentTypeDetectorService {

    public DocumentType detect(String content) {
        String text = normalize(content);
        if (text.isBlank()) {
            return DocumentType.UNKNOWN;
        }

        int srsScore = score(text, Map.of(
            "software requirements specification", 5,
            "srs", 4,
            "functional requirements", 3,
            "non-functional requirements", 3,
            "external interfaces", 2
        ));

        int sddScore = score(text, Map.of(
            "software design description", 5,
            "sdd", 4,
            "system architecture", 3,
            "component design", 3,
            "interface design", 2
        ));

        int spmpScore = score(text, Map.of(
            "software project management plan", 5,
            "spmp", 4,
            "project scope", 3,
            "risk management", 3,
            "scheduling", 2
        ));

        int stdScore = score(text, Map.of(
            "software test documentation", 5,
            "std", 4,
            "test plan", 3,
            "test cases", 3,
            "traceability", 2
        ));

        int best = Math.max(Math.max(srsScore, sddScore), Math.max(spmpScore, stdScore));
        if (best <= 0) {
            return DocumentType.UNKNOWN;
        }
        if (best == srsScore) {
            return DocumentType.SRS;
        }
        if (best == sddScore) {
            return DocumentType.SDD;
        }
        if (best == spmpScore) {
            return DocumentType.SPMP;
        }
        return DocumentType.STD;
    }

    private int score(String text, Map<String, Integer> weightedKeywords) {
        int total = 0;
        for (Map.Entry<String, Integer> entry : weightedKeywords.entrySet()) {
            if (text.contains(entry.getKey())) {
                total += entry.getValue();
            }
        }
        return total;
    }

    private String normalize(String content) {
        return content == null ? "" : content.toLowerCase(Locale.ROOT);
    }
}
