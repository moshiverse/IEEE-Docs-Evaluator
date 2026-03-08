package com.ieee.evaluator.service;

import com.google.api.services.drive.Drive;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Service
public class GoogleDocsService {

    private final Drive driveService;

    public GoogleDocsService(Drive driveService) {
        // We still inject the Drive bean because the Google API uses the Drive API to export Docs
        this.driveService = driveService;
    }

    /**
     * Exports a live Google Doc directly to a plain text string.
     */
    public String exportDocAsText(String fileId) throws IOException {
        try (InputStream is = driveService.files().export(fileId, "text/plain").executeMediaAsInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}