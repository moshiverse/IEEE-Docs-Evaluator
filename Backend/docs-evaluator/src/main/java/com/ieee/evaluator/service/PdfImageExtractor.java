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

    private static final int   DEFAULT_MAX_PAGES = 10;

    // 150 DPI was too low for fine diagram labels (<<include>>, multiplicity,
    // crow's foot notation, PK/FK labels). 250 DPI is the minimum for reliable
    // AI vision analysis of technical diagrams.
    private static final float RENDER_DPI        = 250f;

    // JPEG at 0.92 quality is visually lossless for diagrams but ~5x smaller
    // than PNG at 250 DPI, significantly reducing API token usage per page.
    private static final float JPEG_QUALITY      = 0.92f;

    public List<String> extractFirstPagesAsBase64Pngs(byte[] pdfBytes) throws Exception {
        return extractFirstPagesAsBase64Pngs(pdfBytes, DEFAULT_MAX_PAGES);
    }

    public List<String> extractFirstPagesAsBase64Pngs(byte[] pdfBytes, int maxPages) throws Exception {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return List.of();
        }

        List<String> images = new ArrayList<>();

        try (PDDocument document = PDDocument.load(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(document);
            int pagesToRender = Math.min(Math.max(maxPages, 0), document.getNumberOfPages());

            for (int pageIndex = 0; pageIndex < pagesToRender; pageIndex++) {
                BufferedImage image = renderer.renderImageWithDPI(pageIndex, RENDER_DPI);

                // Convert to RGB — JPEG does not support alpha channels (ARGB).
                // PDFBox may return ARGB images; writing ARGB directly as JPEG
                // produces a corrupted or magenta-tinted image.
                BufferedImage rgbImage = toRgb(image);

                byte[] jpegBytes = encodeAsJpeg(rgbImage, JPEG_QUALITY);
                images.add(Base64.getEncoder().encodeToString(jpegBytes));
            }
        }

        return images;
    }

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
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
            return out.toByteArray();
        } finally {
            writer.dispose();
        }
    }
}