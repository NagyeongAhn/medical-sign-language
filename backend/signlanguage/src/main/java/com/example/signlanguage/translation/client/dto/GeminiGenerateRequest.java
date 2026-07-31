package com.example.signlanguage.translation.client.dto;

import java.util.List;

public record GeminiGenerateRequest(
        SystemInstruction systemInstruction,
        List<Content> contents,
        GenerationConfig generationConfig
) {

    public static GeminiGenerateRequest of(
            String systemInstruction,
            String userPrompt
    ) {
        return new GeminiGenerateRequest(
                new SystemInstruction(
                        List.of(new Part(systemInstruction))
                ),
                List.of(
                        new Content(
                                "user",
                                List.of(new Part(userPrompt))
                        )
                ),
                new GenerationConfig(
                        100,
                        new ThinkingConfig("minimal")
                )
        );
    }

    public record SystemInstruction(List<Part> parts) {
    }

    public record Content(String role, List<Part> parts) {
    }

    public record Part(String text) {
    }

    public record GenerationConfig(
            int maxOutputTokens,
            ThinkingConfig thinkingConfig
    ) {
    }

    public record ThinkingConfig(String thinkingLevel) {
    }
}
