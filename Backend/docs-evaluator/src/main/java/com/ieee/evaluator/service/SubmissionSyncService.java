package com.ieee.evaluator.service;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.ieee.evaluator.model.DriveFile;
import com.ieee.evaluator.model.DeliverableConfig;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SubmissionSyncService {

    private final Sheets sheetsService;
    private final GoogleSheetsService configLoader;
    private final DynamicConfigService configService;

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("M/d/yyyy H:mm:ss");

    public SubmissionSyncService(Sheets sheetsService, GoogleSheetsService configLoader, DynamicConfigService configService) {
        this.sheetsService = sheetsService;
        this.configLoader = configLoader;
        this.configService = configService;
    }

    public List<DriveFile> getLatestSubmissions() throws IOException {
        Map<String, DeliverableConfig> configMap;
        try {
            configMap = configLoader.getDeliverableConfigs();
        } catch (Exception e) {
            throw new IOException("Could not load deliverable rules: " + e.getMessage());
        }

        String spreadsheetId = configService.getValue("GOOGLE_SHEET_ID");
        String responsesRange = configService.getValue("GOOGLE_RESPONSES_RANGE");

        // Fetch Core Info Columns
        int colTimestamp = getColumnIndexSafely("COL_INDEX_TIMESTAMP"); 
        int colName = getColumnIndexSafely("COL_INDEX_NAME");          
        int colSection = getColumnIndexSafely("COL_INDEX_SECTION");    
        int colTeam = getColumnIndexSafely("COL_INDEX_TEAM");          

        // Fetch Specific Document Columns (Matches your SQL!)
        int colSrs = getColumnIndexSafely("COL_INDEX_SRS");
        int colSdd = getColumnIndexSafely("COL_INDEX_SDD");
        int colSpmp = getColumnIndexSafely("COL_INDEX_SPMP");
        int colStd = getColumnIndexSafely("COL_INDEX_STD");

        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, responsesRange)
                .execute();

        List<List<Object>> values = response.getValues();
        List<DriveFile> submissions = new ArrayList<>();

        if (values != null) {
            // Start at i=1 if row 0 is headers, or keep at 0 if your range ignores headers
            for (List<Object> row : values) {
                if (row.isEmpty()) continue;

                String timestampStr = row.size() > colTimestamp && colTimestamp >= 0 ? row.get(colTimestamp).toString() : "Unknown Date";
                String studentName = row.size() > colName && colName >= 0 ? row.get(colName).toString() : "Unknown Student";
                String teamCode = row.size() > colTeam && colTeam >= 0 ? row.get(colTeam).toString() : "No Team";

                // THE SPLITTER: Checks each column. Skips smoothly if the cell is blank.
                extractAndAddFile(row, colSrs, "SRS", studentName, teamCode, timestampStr, configMap, submissions);
                extractAndAddFile(row, colSdd, "SDD", studentName, teamCode, timestampStr, configMap, submissions);
                extractAndAddFile(row, colSpmp, "SPMP", studentName, teamCode, timestampStr, configMap, submissions);
                extractAndAddFile(row, colStd, "STD", studentName, teamCode, timestampStr, configMap, submissions);
            }
        }
        return submissions;
    }

    private int getColumnIndexSafely(String key) {
        try {
            String value = configService.getValue(key);
            return (value != null && !value.trim().isEmpty()) ? Integer.parseInt(value.trim()) : -1;
        } catch (Exception e) {
            return -1;
        }
    }

    private void extractAndAddFile(List<Object> row, int colIndex, String docType, String studentName, String teamCode, String timestampStr, Map<String, DeliverableConfig> configMap, List<DriveFile> submissions) {
        if (colIndex < 0 || colIndex >= row.size()) return;

        String url = row.get(colIndex).toString().trim();
        if (url.isEmpty()) return; // Ignored if left blank by student!

        String fileId = extractIdFromUrl(url);
        
        if (fileId != null) {
            boolean isLate = false;
            DeliverableConfig config = configMap.get(docType);
            
            if (config != null && !timestampStr.equals("Unknown Date")) {
                try {
                    LocalDateTime submissionTime = LocalDateTime.parse(timestampStr, TIMESTAMP_FORMATTER);
                    isLate = submissionTime.isAfter(config.getDeadline());
                } catch (Exception e) {
                    System.err.println("Could not parse date for " + studentName + ": " + e.getMessage());
                }
            }

            DriveFile file = new DriveFile();
            file.setId(fileId);
            file.setWebViewLink(url);
            
            String statusPrefix = isLate ? "[LATE] " : "";
            file.setName(statusPrefix + "[" + docType + "] " + teamCode + " | " + studentName);
            file.setSubmittedAt(timestampStr);
            file.setMimeType("application/vnd.google-apps.document");

            submissions.add(file);
        }
    }

    private String extractIdFromUrl(String url) {
        if (url == null || url.isEmpty()) return null;
        Pattern pattern = Pattern.compile("(?:/d/|folders/|id=)([a-zA-Z0-9_-]{25,})");
        Matcher matcher = pattern.matcher(url);
        
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null; 
    }
}