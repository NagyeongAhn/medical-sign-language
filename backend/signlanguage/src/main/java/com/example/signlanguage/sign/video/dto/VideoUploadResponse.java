package com.example.signlanguage.sign.video.dto;

import com.example.signlanguage.sign.video.domain.ProcessingStatus;
import com.example.signlanguage.sign.video.domain.SignVideo;

import java.time.LocalDateTime;

public record VideoUploadResponse(
        Long id,
        String originalFilename,
        String contentType,
        long fileSize,
        Long durationMs,
        ProcessingStatus processingStatus,
        LocalDateTime uploadedAt
) {
    public static VideoUploadResponse from(SignVideo video) {
        return new VideoUploadResponse(
                video.getId(),
                video.getOriginalFilename(),
                video.getContentType(),
                video.getFileSize(),
                video.getDurationMs(),
                video.getProcessingStatus(),
                video.getUploadedAt()
        );
    }
}
