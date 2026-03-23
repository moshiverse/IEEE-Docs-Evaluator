package com.ieee.evaluator.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.security.GeneralSecurityException;

@Configuration
public class GoogleSheetsConfig {

    private final GoogleCredential googleCredential;

    public GoogleSheetsConfig(GoogleCredential googleCredential) {
        this.googleCredential = googleCredential;
    }

    @Bean
    public Sheets sheetsService() throws IOException, GeneralSecurityException {
        return new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                googleCredential)
                .setApplicationName("IEEE Docs Evaluator")
                .build();
    }
}