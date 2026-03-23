package com.ieee.evaluator.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.sheets.v4.SheetsScopes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

@Configuration
public class GoogleCredentialConfig {

    @Value("${app.google.service-account-json:}")
    private String serviceAccountJson;

    @Value("${app.google.service-account-json-base64:}")
    private String serviceAccountJsonBase64;

    @Bean
    public GoogleCredential googleCredential() throws IOException {
        GoogleCredential credential = GoogleCredential.fromStream(openCredentialStream());

        if (credential.createScopedRequired()) {
            credential = credential.createScoped(List.of(
                    DriveScopes.DRIVE,
                    SheetsScopes.SPREADSHEETS_READONLY
            ));
        }

        return credential;
    }

    private InputStream openCredentialStream() throws IOException {
        if (serviceAccountJson != null && !serviceAccountJson.isBlank()) {
            return new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8));
        }

        if (serviceAccountJsonBase64 != null && !serviceAccountJsonBase64.isBlank()) {
            byte[] decoded = Base64.getDecoder().decode(serviceAccountJsonBase64);
            return new ByteArrayInputStream(decoded);
        }

        ClassPathResource fallback = new ClassPathResource("google-service-account.json");
        if (fallback.exists()) {
            return fallback.getInputStream();
        }

        throw new IllegalStateException(
                "Google service account credentials are missing. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, or provide src/main/resources/google-service-account.json."
        );
    }
}
