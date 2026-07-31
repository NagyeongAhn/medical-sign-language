package com.example.signlanguage.translation.dto;

import com.example.signlanguage.translation.domain.TranslationSession;
import com.example.signlanguage.translation.domain.TranslationStatus;

import java.time.LocalDateTime;
import java.util.List;

public record TranslationResponse(
        Long sessionId,
        TranslationStatus status,
        String generatedSentence,
        List<RecognizedWordResponse> words,
        LocalDateTime createdAt
) {
    public static TranslationResponse from(TranslationSession session) {
        List<RecognizedWordResponse> words = session.getRecognizedWords()
                .stream()
                .map(RecognizedWordResponse::from)
                .toList();

        return new TranslationResponse(
                session.getId(),
                session.getStatus(),
                session.getGeneratedSentence(),
                words,
                session.getCreatedAt()
        );
    }
}
