package com.example.signlanguage.global.exception;

public class SentenceGenerationException extends RuntimeException {

    public SentenceGenerationException(String message) {
        super(message);
    }

    public SentenceGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
