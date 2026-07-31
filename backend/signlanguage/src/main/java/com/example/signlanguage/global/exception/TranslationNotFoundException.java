package com.example.signlanguage.global.exception;

public class TranslationNotFoundException extends RuntimeException {

    public TranslationNotFoundException(long sessionId) {
        super("번역 세션을 찾을 수 없습니다. id=" + sessionId);
    }
}
