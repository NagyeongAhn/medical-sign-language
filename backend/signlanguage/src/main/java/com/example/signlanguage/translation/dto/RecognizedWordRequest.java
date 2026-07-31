package com.example.signlanguage.translation.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RecognizedWordRequest(
        @NotBlank
        @Size(max = 50)
        String wordId,

        @NotBlank
        @Size(max = 100)
        String wordLabel,

        @NotNull
        @DecimalMin("0.0")
        @DecimalMax("1.0")
        Double confidence
) {
}
