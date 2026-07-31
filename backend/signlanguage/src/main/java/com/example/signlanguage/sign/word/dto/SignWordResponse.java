package com.example.signlanguage.sign.word.dto;

import com.example.signlanguage.sign.word.domain.SignWord;
import com.example.signlanguage.sign.word.domain.SignWordCategory;

public record SignWordResponse(
        String wordId,
        String wordLabel,
        SignWordCategory category,
        String recordingKey,
        int displayOrder
) {

    public static SignWordResponse from(SignWord signWord) {
        return new SignWordResponse(
                signWord.getWordId(),
                signWord.getWordLabel(),
                signWord.getCategory(),
                signWord.getRecordingKey(),
                signWord.getDisplayOrder()
        );
    }
}
