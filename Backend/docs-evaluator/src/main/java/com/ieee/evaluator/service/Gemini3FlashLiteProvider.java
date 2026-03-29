package com.ieee.evaluator.service;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.UploadFileConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
@Slf4j
public class Gemini3FlashLiteProvider implements AiProvider, DriveAwareAiProvider
{
    private static final String MODEL_ID = "gemini-3.1-flash-lite-preview";
    private static final String PDF_MIME = "application/pdf";
    private static final String API_KEY_SETTING = "GEMINI_3.1_API_KEY";
    private static final String GEMINI_URI_BASE = "https://generativelanguage.googleapis.com/";

    private final DynamicConfigService configService;
    private final GoogleDocsService googleDocsService;

    public Gemini3FlashLiteProvider(DynamicConfigService configService, GoogleDocsService googleDocsService)
    {
        this.configService = configService;
        this.googleDocsService = googleDocsService;
    }

    @Override
    public String getProviderName()
    {
        // This value must match what the frontend sends in the "model" field.
        return "gemini-3-flashlite";
    }

    @Override
    public String analyze(String text)
    {
        // This provider is drive-aware and expects a Drive file ID.
        return "SYSTEM ERROR: gemini-3.1-flash-lite requires Drive file context.";
    }

    @Override
    public String analyzeFromDrive(String fileId, String fileName)
    {
        String apiKey = configService.getValue(API_KEY_SETTING);

        if (apiKey == null || apiKey.isBlank())
        {
            return "SYSTEM ERROR: GEMINI_3.1_API_KEY is missing in system settings.";
        }

        final byte[] pdfBytes;
        final long prepareStartMs = System.currentTimeMillis();

        try
        {
            // Converts Google Doc / DOCX / PDF from Drive into PDF bytes for native PDF vision.
            pdfBytes = googleDocsService.exportDocAsPdfBytesForVision(fileId);
            log.info("Gemini PDF preparation complete: fileId={}, bytes={}, elapsedMs={}",
                    fileId, (pdfBytes == null ? 0 : pdfBytes.length), (System.currentTimeMillis() - prepareStartMs));
        }
        catch (Exception e)
        {
            log.error("Failed preparing Drive file for Gemini vision: {}", e.getMessage(), e);
            return "SYSTEM ERROR: Failed to fetch/convert Drive file to PDF. " + e.getMessage();
        }

        if (pdfBytes == null || pdfBytes.length == 0)
        {
            return "ERROR: Generated PDF content is empty.";
        }

        return callGeminiWithPdf(apiKey, fileName, pdfBytes);
    }

    private String callGeminiWithPdf(String apiKey, String fileName, byte[] pdfBytes)
    {
        Path tempPdfPath = null;
        com.google.genai.types.File uploadedFile = null;
        Client client = null;

        try
        {
            client = Client.builder().apiKey(apiKey).build();

            // Write bytes to a temp file because SDK upload API accepts path/InputStream.
            tempPdfPath = Files.createTempFile("gemini-vision-", ".pdf");
            Files.write(tempPdfPath, pdfBytes);

            uploadedFile = client.files.upload(
                    tempPdfPath.toString(),
                    UploadFileConfig.builder().mimeType(PDF_MIME).build()
            );

            // File "name" is usually like files/abc123 and is used for get/delete.
            String uploadedName = uploadedFile.name()
                    .orElseThrow(() -> new IllegalStateException("Gemini upload returned no file name."));

            // Fetch metadata again to obtain the canonical URI and mime type.
            com.google.genai.types.File uploadedMeta = client.files.get(uploadedName, null);

            String rawUri = uploadedMeta.uri().orElse(uploadedName);
            String uploadedUri = normalizeGeminiFileUri(rawUri);
            String uploadedMimeType = uploadedMeta.mimeType().orElse(PDF_MIME);

            log.info("Gemini file uploaded: name={}, rawUri={}, finalUri={}, mime={}",
                    uploadedName, rawUri, uploadedUri, uploadedMimeType);

            Content content = Content.fromParts(
                    Part.fromText(buildAnalysisPrompt(fileName)),
                    Part.fromUri(uploadedUri, uploadedMimeType)
            );

            GenerateContentResponse response = client.models.generateContent(
                    MODEL_ID,
                    content,
                    null
            );

            String result = response.text();

            if (result == null || result.isBlank())
            {
                throw new RuntimeException("Gemini returned an empty response.");
            }

            return result;
        }
        catch (Throwable t)
        {
            log.error("Gemini 3.1 Flash-Lite analysis failed: {}", t.getMessage(), t);
            return "SYSTEM ERROR: Gemini 3.1 Flash-Lite analysis failed. " + t.getMessage();
        }
        finally
        {
            // Best-effort cleanup of uploaded Gemini file.
            if (client != null && uploadedFile != null && uploadedFile.name().isPresent())
            {
                try
                {
                    client.files.delete(uploadedFile.name().get(), null);
                }
                catch (Exception cleanupError)
                {
                    log.warn("Failed to delete uploaded Gemini file: {}", cleanupError.getMessage());
                }
            }

            // Best-effort cleanup of temp file.
            if (tempPdfPath != null)
            {
                try
                {
                    Files.deleteIfExists(tempPdfPath);
                }
                catch (Exception cleanupError)
                {
                    log.warn("Failed to delete temporary PDF: {}", cleanupError.getMessage());
                }
            }
        }
    }

    private String normalizeGeminiFileUri(String rawUri)
    {
        // Gemini generateContent expects a URI, not just files/<id>.
        if (rawUri == null || rawUri.isBlank())
        {
            throw new IllegalStateException("Gemini file URI is missing.");
        }

        if (rawUri.startsWith("http://") || rawUri.startsWith("https://"))
        {
            return rawUri;
        }

        if (rawUri.startsWith("files/"))
        {
            return GEMINI_URI_BASE + rawUri;
        }

        return GEMINI_URI_BASE + "files/" + rawUri;
    }

    private String buildAnalysisPrompt(String fileName)
    {
        String safeFileName = (fileName == null || fileName.isBlank()) ? "Unknown file" : fileName;

        return """
            You are an expert evaluator of software engineering documents following IEEE standards.

            File Name:
            %s

            STEP 1 — Identify the document type:

            * SRS (IEEE 830 Software Requirements Specification)
            * SDD (IEEE 1016 Software Design Description)
            * SPMP (IEEE 1058 Software Project Management Plan)
            * STD (IEEE 829 Software Test Documentation)

            If the document is empty, unreadable, or not a software engineering document, reply exactly:
            ERROR: Invalid Software Engineering document.

            STEP 2 — Evaluate the document using the correct rubric:

            For SRS (IEEE 830), evaluate:
            * Introduction & Scope
            * Overall Description
            * Functional Requirements
            * Non-Functional Requirements
            * External Interfaces

            For SDD (IEEE 1016), evaluate:
            * System Architecture
            * Data Design
            * Component Design
            * Interface Design
            * Design Decisions

            For SPMP (IEEE 1058), evaluate:
            * Project Scope & Objectives
            * Scheduling & Timeline
            * Resource Allocation
            * Risk Management
            * Monitoring & Control

            For STD (IEEE 829), evaluate:
            * Test Plan
            * Test Cases
            * Test Procedures
            * Test Coverage
            * Traceability to Requirements

            STEP 3 — Score each criterion from 1 to 5:
            1 = Poor / Missing
            2 = Weak
            3 = Acceptable
            4 = Good
            5 = Excellent

            STEP 4 — Provide structured output EXACTLY in this format:

            Document Type: <Detected Type>

            Overall Score: X/25

            Summary:
            * (2–3 bullet points)

            Rubric Evaluation:
            * <Criterion 1>: X/5 — (short justification)
            * <Criterion 2>: X/5 — (short justification)
            * <Criterion 3>: X/5 — (short justification)
            * <Criterion 4>: X/5 — (short justification)
            * <Criterion 5>: X/5 — (short justification)

            Strengths:
            * (2–3 bullet points)

            Weaknesses:
            * (2–3 bullet points)

            Missing or Incomplete Sections:
            * (list specific missing parts, if any)

            Recommendations:
            * (2–3 actionable improvements)

            Conclusion:
            * (overall quality judgment)

            IMPORTANT:
            * Be strict and realistic (like a professor grading a capstone)
            * Do NOT inflate scores
            * Base evaluation only on the provided content
            * Do not hallucinate sections—if a section is missing, mark it as missing
            """.formatted(safeFileName);
    }
}