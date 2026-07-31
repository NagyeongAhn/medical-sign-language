package com.example.signlanguage.translation.service;

import com.example.signlanguage.sign.word.domain.SignWordCategory;

public record SentenceWord(
        String label,
        SignWordCategory category
) {
}
