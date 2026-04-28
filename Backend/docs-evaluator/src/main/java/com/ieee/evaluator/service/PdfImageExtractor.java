package com.ieee.evaluator.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class PdfImageExtractor {

    // ── Fallback constants — used when DB settings are missing or invalid ─────
    private static final int   FALLBACK_MAX_PAGES    = 999;
    private static final float FALLBACK_RENDER_DPI   = 300f;
    private static final float FALLBACK_JPEG_QUALITY = 1f;

    private final SystemSettingService settingsService;

    public PdfImageExtractor(SystemSettingService settingsService) {
        this.settingsService = settingsService;
    }

    public List<String> extractFirstPagesAsBase64Pngs(byte[] pdfBytes) throws Exception {
        return extractFirstPagesAsBase64Pngs(pdfBytes, readMaxPages());
    }

    public List<String> extractFirstPagesAsBase64Pngs(byte[] pdfBytes, int maxPages) throws Exception {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return List.of();
        }

        float renderDpi   = readRenderDpi();
        float jpegQuality = readJpegQuality();

        List<String> images = new ArrayList<>();

        try (PDDocument document = PDDocument.load(pdfBytes)) {
            PDFRenderer renderer     = new PDFRenderer(document);
            int         pagesToRender = Math.min(Math.max(maxPages, 0), document.getNumberOfPages());

            for (int pageIndex = 0; pageIndex < pagesToRender; pageIndex++) {
                BufferedImage image    = renderer.renderImageWithDPI(pageIndex, renderDpi);
                BufferedImage rgbImage = toRgb(image);
                byte[]        jpegBytes = encodeAsJpeg(rgbImage, jpegQuality);
                images.add(Base64.getEncoder().encodeToString(jpegBytes));
            }
        }

        return images;
    }

    // ── DB setting readers — each falls back gracefully ───────────────────────

    private int readMaxPages() {
        try {
            String val = settingsService.getValueOrNull("RENDER_MAX_PAGES");
            if (val != null && !val.isBlank()) {
                int parsed = Integer.parseInt(val.trim());
                if (parsed > 0) return parsed;
            }
        } catch (Exception ignored) {}
        return FALLBACK_MAX_PAGES;
    }

    private float readRenderDpi() {
        try {
            String val = settingsService.getValueOrNull("RENDER_DPI");
            if (val != null && !val.isBlank()) {
                float parsed = Float.parseFloat(val.trim());
                if (parsed >= 72f && parsed <= 600f) return parsed;
            }
        } catch (Exception ignored) {}
        return FALLBACK_RENDER_DPI;
    }

    private float readJpegQuality() {
        try {
            String val = settingsService.getValueOrNull("RENDER_JPEG_QUALITY");
            if (val != null && !val.isBlank()) {
                float parsed = Float.parseFloat(val.trim());
                if (parsed >= 0.1f && parsed <= 1.0f) return parsed;
            }
        } catch (Exception ignored) {}
        return FALLBACK_JPEG_QUALITY;
    }

    // ── Image helpers ─────────────────────────────────────────────────────────

    /**
     * Converts any BufferedImage to TYPE_INT_RGB, which is required for JPEG encoding.
     * If the image is already RGB (no alpha), returns it as-is to avoid a redundant copy.
     */
    private BufferedImage toRgb(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_RGB) {
            return source;
        }
        BufferedImage rgb = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        rgb.createGraphics().drawImage(source, 0, 0, java.awt.Color.WHITE, null);
        return rgb;
    }

    /**
     * Encodes a BufferedImage as JPEG at the given quality (0.0–1.0).
     * Uses the explicit ImageWriter API to control compression quality,
     * since ImageIO.write() does not expose quality settings.
     */
    private byte[] encodeAsJpeg(BufferedImage image, float quality) throws Exception {
        ImageWriter    writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             ImageOutputStream ios    = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
            return out.toByteArray();
        } finally {
            writer.dispose();
        }
    }
}