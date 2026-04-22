package com.ieee.evaluator.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class PdfImageExtractor {

    private static final int DEFAULT_MAX_PAGES = 10;
    private static final float RENDER_DPI = 150f;

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
                try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    ImageIO.write(image, "png", out);
                    images.add(Base64.getEncoder().encodeToString(out.toByteArray()));
                }
            }
        }

        return images;
    }
}
