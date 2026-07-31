package com.example.signlanguage.translation.dto;

import com.example.signlanguage.translation.domain.RecognizedWord;

public record RecognizedWordResponse(
        String wordId,
        String wordLabel,
        int sequenceOrder,
        double confidence
) {
    public static RecognizedWordResponse from(RecognizedWord word) {
        return new RecognizedWordResponse(
                word.getWordId(),
                word.getWordLabel(),
                word.getSequenceOrder(),
                word.getConfidence()
        );
    }
}
