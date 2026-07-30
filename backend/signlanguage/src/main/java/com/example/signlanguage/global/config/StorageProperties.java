package com.example.signlanguage.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Set;

@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(
        String uploadDir,
        long maxFileSize,
        Set<String> allowedExtensions,
        Set<String> allowedContentTypes
) {
}
