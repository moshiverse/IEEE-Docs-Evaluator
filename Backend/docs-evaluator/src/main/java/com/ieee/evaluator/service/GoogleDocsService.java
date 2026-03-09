package com.ieee.evaluator.service;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Service
public class GoogleDocsService {

    private final Drive driveService;

    public GoogleDocsService(Drive driveService) {
        this.driveService = driveService;
    }

    /**
     * Intelligently downloads and extracts text from Google Docs, Word Docs, and PDFs.
     */
    public String exportDocAsText(String fileId) throws Exception {
        if (fileId == null || fileId.isEmpty()) {
            throw new IllegalArgumentException("File ID cannot be null or empty");
        }

        try {
            // 1. BE SMART: Ask Google Drive what kind of file this actually is
            File fileInfo = driveService.files()
                    .get(fileId)
                    .setFields("name, mimeType")
                    .execute();

            String mimeType = fileInfo.getMimeType();
            System.out.println("DEBUG: Detected file type: " + mimeType + " for " + fileInfo.getName());

            // 2. ROUTE IT: Handle Native Google Docs
            if (mimeType.equals("application/vnd.google-apps.document")) {
                try (InputStream is = driveService.files().export(fileId, "text/plain").executeMediaAsInputStream()) {
                    return new String(is.readAllBytes(), StandardCharsets.UTF_8);
                }
            } 
            
            // 3. ROUTE IT: Handle Binary Files (PDF, DOCX, TXT)
            else if (isSupportedBinary(mimeType)) {
                // Notice we use .get() instead of .export() here for binary files!
                try (InputStream is = driveService.files().get(fileId).setAlt("media").executeMediaAsInputStream()) {
                    return extractTextWithTika(is);
                }
            } 
            
            // 4. GRACEFUL FAILURE: If it's a folder, zip, or image, reject it safely
            else {
                throw new Exception("Unsupported file format: " + fileInfo.getName() + " (" + mimeType + "). The evaluator currently supports Google Docs, PDFs, Word Documents, and plain text files.");
            }

        } catch (GoogleJsonResponseException e) {
            // Give the teacher a human-readable error if the student forgot to open link sharing
            if (e.getStatusCode() == 403 || e.getStatusCode() == 404) {
                throw new Exception("Permission denied or file not found. Ensure the student set the Google Drive sharing settings to 'Anyone with the link can view'.");
            }
            throw e; // Rethrow if it's a different API error
        }
    }

    /**
     * Checks if the file is a supported binary format
     */
    private boolean isSupportedBinary(String mimeType) {
        return mimeType.equals("application/pdf") ||
               mimeType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
               mimeType.equals("text/plain");
    }

    /**
     * Uses Apache Tika to magically rip the text out of binary files like PDFs and DOCX
     */
    private String extractTextWithTika(InputStream inputStream) throws Exception {
        // -1 disables the character limit so it can read massive documents
        BodyContentHandler handler = new BodyContentHandler(-1); 
        AutoDetectParser parser = new AutoDetectParser();
        Metadata metadata = new Metadata();
        ParseContext context = new ParseContext();

        // Tika automatically detects the exact file format and extracts the plain text
        parser.parse(inputStream, handler, metadata, context);
        return handler.toString();
    }
}