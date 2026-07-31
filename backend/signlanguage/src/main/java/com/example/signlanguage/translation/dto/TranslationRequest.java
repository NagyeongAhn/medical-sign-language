package com.example.signlanguage.translation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record TranslationRequest(
        @NotEmpty
        @Size(max = 5)
        List<@Valid RecognizedWordRequest> words
) {
}
