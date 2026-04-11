package com.ieee.evaluator.config;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.security.GeneralSecurityException;

@Configuration
public class GoogleDriveConfig {

    private final Credential googleCredential;

    public GoogleDriveConfig(Credential googleCredential) {
        this.googleCredential = googleCredential;
    }

    @Bean
    public Drive driveService() throws IOException, GeneralSecurityException {
        HttpRequestInitializer timeoutInitializer = request -> {
            googleCredential.initialize(request);
            request.setConnectTimeout(60_000);
            request.setReadTimeout(300_000);
        };

        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                timeoutInitializer
        )
                .setApplicationName("IEEE Docs Evaluator")
                .build();
    }
}