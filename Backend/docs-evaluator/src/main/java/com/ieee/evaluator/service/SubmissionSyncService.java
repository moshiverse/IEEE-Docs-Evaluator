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
    private final DynamicConfigService configService; // NEW: The Brains!

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("M/d/yyyy H:mm:ss");

    public SubmissionSyncService(Sheets sheetsService, GoogleSheetsService configLoader, DynamicConfigService configService) {
        this.sheetsService = sheetsService;
        this.configLoader = configLoader;
        this.configService = configService;
    }

    public List<DriveFile> getLatestSubmissions() throws IOException {
        // 1. Load Deadline Rules
        Map<String, DeliverableConfig> configMap;
        try {
            configMap = configLoader.getDeliverableConfigs();
        } catch (Exception e) {
            throw new IOException("Could not load deliverable rules: " + e.getMessage());
        }

        // 2. DYNAMIC: Fetch Google configurations from Supabase Database
        String spreadsheetId = configService.getValue("GOOGLE_SHEET_ID");
        String responsesRange = configService.getValue("GOOGLE_RESPONSES_RANGE");

        // 3. DYNAMIC: Fetch all Column Indices (0-based)
        int colTimestamp = configService.getIntValue("COL_INDEX_TIMESTAMP"); 
        int colName = configService.getIntValue("COL_INDEX_NAME");           
        int colSection = configService.getIntValue("COL_INDEX_SECTION");     
        int colTeam = configService.getIntValue("COL_INDEX_TEAM");           
        int colType = configService.getIntValue("COL_INDEX_TYPE");           
        int colUrl = configService.getIntValue("COL_INDEX_DOC_LINK");        

        // Smart check: Find the highest column index we need, so we don't hit IndexOutOfBounds
        int maxColRequired = Math.max(Math.max(Math.max(colTimestamp, colName), Math.max(colSection, colTeam)), Math.max(colType, colUrl));

        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, responsesRange)
                .execute();

        List<List<Object>> values = response.getValues();
        List<DriveFile> submissions = new ArrayList<>();

        if (values != null) {
            for (int i = 0; i < values.size(); i++) {
                List<Object> row = values.get(i);
                
                // Ensure the row actually has enough data to safely pull from our dynamic columns
                if (row.size() > maxColRequired) {
                    String timestampStr = row.get(colTimestamp).toString(); 
                    String studentName = row.get(colName).toString();  
                    String section = row.get(colSection).toString();      
                    String teamCode = row.get(colTeam).toString();     
                    String deliverableType = row.get(colType).toString().trim(); 
                    String url = row.get(colUrl).toString().trim();             

                    String fileId = extractIdFromUrl(url);
                    
                    if (fileId != null) {
                        try {
                            boolean isLate = false;
                            DeliverableConfig config = configMap.get(deliverableType);
                            
                            if (config != null) {
                                LocalDateTime submissionTime = LocalDateTime.parse(timestampStr, TIMESTAMP_FORMATTER);
                                isLate = submissionTime.isAfter(config.getDeadline());
                            }

                            // Create a representation of the file to send to the dashboard
                            DriveFile file = new DriveFile();
                            file.setId(fileId);
                            file.setWebViewLink(url);
                            
                            String statusPrefix = isLate ? "[LATE] " : "";
                            file.setName(statusPrefix + "[" + deliverableType + "] " + teamCode + " | " + studentName);
                            file.setSubmittedAt(timestampStr);
                            
                            // We default to Google Docs mime type since we are parsing direct URLs
                            file.setMimeType("application/vnd.google-apps.document");

                            submissions.add(file);
                            
                        } catch (Exception e) {
                            System.err.println("Processing error for " + studentName + ": " + e.getMessage());
                        }
                    } else {
                        System.err.println("DEBUG: Could not find valid File ID for " + studentName);
                    }
                }
            }
        }
        return submissions;
    }

    /**
     * Extracts the Google Doc ID from the raw submitted URL
     */
    private String extractIdFromUrl(String url) {
        if (url == null || url.isEmpty()) return null;
        Pattern pattern = Pattern.compile("(?:/d/|folders/|id=)([a-zA-Z0-9_-]{25,})");
        Matcher matcher = pattern.matcher(url);
        
        if (matcher.find()) {
            return matcher.group(1);
        }
        return url; // Fallback
    }
}