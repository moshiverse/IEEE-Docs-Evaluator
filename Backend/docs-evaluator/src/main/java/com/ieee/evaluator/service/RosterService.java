package com.ieee.evaluator.service;

import com.ieee.evaluator.model.StudentTrackerRecord;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RosterService {

    private final GoogleSheetsService sheetsService;

    public RosterService(GoogleSheetsService sheetsService) {
        this.sheetsService = sheetsService;
    }

    public List<StudentTrackerRecord> getClassRoster() throws Exception {
        // Read columns B:D (Name, Section, Team Code) — skip column A (Gmail) since many rows have it empty
        String range = "Students!B2:D";
        List<List<Object>> rows = sheetsService.getSheetData(range);
        List<StudentTrackerRecord> roster = new ArrayList<>();

        if (rows == null || rows.isEmpty()) {
            return roster;
        }

        for (List<Object> row : rows) {
            if (row == null || row.isEmpty()) continue;

            String name = row.get(0).toString().trim();
            if (name.isEmpty()) continue;

            String section = row.size() > 1 ? row.get(1).toString().trim() : "";
            String teamCode = row.size() > 2 ? row.get(2).toString().trim() : "";

            roster.add(new StudentTrackerRecord(name, section, teamCode, "STUDENT"));
        }

        return roster;
    }
}
