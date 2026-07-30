package com.example.signlanguage.global.exception;

public class VideoNotFoundException extends RuntimeException {

    public VideoNotFoundException(long videoId) {
        super("영상을 찾을 수 없습니다. videoId=" + videoId);
    }
}
