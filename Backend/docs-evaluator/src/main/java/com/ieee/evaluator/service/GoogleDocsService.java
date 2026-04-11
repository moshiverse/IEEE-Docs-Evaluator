package com.ieee.evaluator.service;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.ByteArrayContent;
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
public class GoogleDocsService 
{
    private static final String GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
    private static final String PDF_MIME = "application/pdf";
    private static final String DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private static final String PLAIN_TEXT_MIME = "text/plain";

    private final Drive driveService;

    public GoogleDocsService(Drive driveService) 
    {
        this.driveService = driveService;
    }

    public String exportDocAsText(String fileId) throws Exception 
    {
        if (fileId == null || fileId.isEmpty()) 
        {
            throw new IllegalArgumentException("File ID cannot be null or empty");
        }

        try 
        {
            File fileInfo = driveService.files()
                    .get(fileId)
                    .setFields("id,name,mimeType")
                    .execute();

            String mimeType = fileInfo.getMimeType();

            if (GOOGLE_DOC_MIME.equals(mimeType)) 
            {
                try (InputStream is = driveService.files().export(fileId, PLAIN_TEXT_MIME).executeMediaAsInputStream()) 
                {
                    return new String(is.readAllBytes(), StandardCharsets.UTF_8);
                }
            } 
            else if (isSupportedBinaryForTextExtraction(mimeType)) 
            {
                try (InputStream is = driveService.files().get(fileId).setAlt("media").executeMediaAsInputStream()) 
                {
                    return extractTextWithTika(is);
                }
            } 
            else 
            {
                throw new Exception
                (
                        "Unsupported file format: " + fileInfo.getName() + " (" + mimeType + "). " +
                        "Supported formats are Google Docs, PDF, DOCX, and plain text."
                );
            }

        } 
        catch (GoogleJsonResponseException e) 
        {
            throw toFriendlyDriveException(e);
        }
    }

    public byte[] exportDocAsPdfBytesForVision(String fileId) throws Exception 
    {
        if (fileId == null || fileId.isEmpty()) 
        {
            throw new IllegalArgumentException("File ID cannot be null or empty");
        }

        try 
        {
            File fileInfo = driveService.files()
                    .get(fileId)
                    .setFields("id,name,mimeType")
                    .execute();

            String mimeType = fileInfo.getMimeType();

            if (GOOGLE_DOC_MIME.equals(mimeType)) 
            {
                return exportGoogleDocAsPdf(fileId);
            }

            if (PDF_MIME.equals(mimeType)) 
            {
                return downloadBlobBytes(fileId);
            }

            if (DOCX_MIME.equals(mimeType)) 
            {
                return convertDocxToTemporaryGoogleDocAndExportPdf(fileInfo);
            }

            throw new Exception
            (
                    "Unsupported file format for Gemini vision: " + fileInfo.getName() + " (" + mimeType + "). " +
                    "Supported formats are Google Docs, PDF, and DOCX."
            );

        } 
        catch (GoogleJsonResponseException e) 
        {
            throw toFriendlyDriveException(e);
        }
    }

    private byte[] convertDocxToTemporaryGoogleDocAndExportPdf(File sourceFile) throws Exception 
    {
        byte[] docxBytes = downloadBlobBytes(sourceFile.getId());
        String tempGoogleDocId = null;

        try 
        {
            File tempMetadata = new File();
            tempMetadata.setName(sourceFile.getName() + " [tmp-gemini-conversion]");
            tempMetadata.setMimeType(GOOGLE_DOC_MIME);

            ByteArrayContent mediaContent = new ByteArrayContent(DOCX_MIME, docxBytes);

            File tempGoogleDoc = driveService.files()
                    .create(tempMetadata, mediaContent)
                    .setFields("id,name,mimeType")
                    .execute();

            tempGoogleDocId = tempGoogleDoc.getId();

            return exportGoogleDocAsPdf(tempGoogleDocId);
        } 
        finally 
        {
            if (tempGoogleDocId != null) 
            {
                try 
                {
                    driveService.files().delete(tempGoogleDocId).execute();
                } 
                catch (Exception cleanupError) 
                {
                    System.err.println("WARN: Failed to delete temporary converted Google Doc: " + cleanupError.getMessage());
                }
            }
        }
    }

    private byte[] exportGoogleDocAsPdf(String fileId) throws Exception 
    {
        try (InputStream is = driveService.files().export(fileId, PDF_MIME).executeMediaAsInputStream()) 
        {
            return is.readAllBytes();
        }
    }

    private byte[] downloadBlobBytes(String fileId) throws Exception 
    {
        try (InputStream is = driveService.files().get(fileId).setAlt("media").executeMediaAsInputStream()) 
        {
            return is.readAllBytes();
        }
    }

    private boolean isSupportedBinaryForTextExtraction(String mimeType) 
    {
        return PDF_MIME.equals(mimeType) || DOCX_MIME.equals(mimeType) || PLAIN_TEXT_MIME.equals(mimeType);
    }

    private String extractTextWithTika(InputStream inputStream) throws Exception 
    {
        // -1 disables the character limit so it can read massive documents
        BodyContentHandler handler = new BodyContentHandler(-1);
        AutoDetectParser parser = new AutoDetectParser();
        Metadata metadata = new Metadata();
        ParseContext context = new ParseContext();

        // Tika automatically detects the exact file format and extracts the plain text
        parser.parse(inputStream, handler, metadata, context);
        return handler.toString();
    }

    private Exception toFriendlyDriveException(GoogleJsonResponseException e) 
    {
        if (e.getStatusCode() == 403 || e.getStatusCode() == 404) 
        {
            return new Exception
            (
                "Permission denied or file not found. Ensure sharing is set to Anyone with the link can view."
            );
        }
        return e;
    }
}