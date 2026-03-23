package com.ieee.evaluator.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.ieee.evaluator.model.DeliverableConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GoogleSheetsService {

    private final Credential credential;
    private final String spreadsheetId;
    
    // Matches the format in your spreadsheet: 3/21/2026 23:59:00
    private static final DateTimeFormatter DEADLINE_FORMATTER = DateTimeFormatter.ofPattern("M/d/yyyy H:mm:ss");

    public GoogleSheetsService(Credential credential, @Value("${app.google.spreadsheet-id:}") String spreadsheetId) {
        this.credential = credential;
        this.spreadsheetId = spreadsheetId;
    }

    /**
     * Fetches the Deliverable Configuration (Tags and Deadlines) 
     * from the 'Deliverables_Config' tab.
     */
    public Map<String, DeliverableConfig> getDeliverableConfigs() throws IOException, GeneralSecurityException {
        Sheets service = new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName("IEEE Docs Evaluator")
                .build();

            ensureSpreadsheetId();

        // Reading Columns A (Tag) and B (Deadline)
        String range = "Deliverables_Config!A2:B";
        ValueRange response = service.spreadsheets().values()
            .get(spreadsheetId, range)
                .execute();

        List<List<Object>> values = response.getValues();
        Map<String, DeliverableConfig> configMap = new HashMap<>();

        if (values == null || values.isEmpty()) {
            return configMap;
        }

        for (List<Object> row : values) {
            if (row.size() >= 2) {
                String tag = row.get(0).toString().trim(); // e.g., "SRS"
                String deadlineStr = row.get(1).toString().trim(); // e.g., "3/21/2026 23:59:00"

                try {
                    LocalDateTime deadline = LocalDateTime.parse(deadlineStr, DEADLINE_FORMATTER);
                    configMap.put(tag, new DeliverableConfig(tag, deadline));
                } catch (Exception e) {
                    System.err.println("Error parsing deadline for tag " + tag + ": " + e.getMessage());
                }
            }
        }
        return configMap;
    }

    /**
     * Fetches generic row data from a specified range in the Google Sheet.
     */
    public List<List<Object>> getSheetData(String range) throws IOException, GeneralSecurityException {
        Sheets service = new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName("IEEE Docs Evaluator")
                .build();

        ensureSpreadsheetId();

        ValueRange response = service.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute();

        return response.getValues();
    }

    private void ensureSpreadsheetId() {
        if (spreadsheetId == null || spreadsheetId.isBlank()) {
            throw new IllegalStateException("Missing GOOGLE_SHEET_ID/app.google.spreadsheet-id configuration.");
        }
    }
}