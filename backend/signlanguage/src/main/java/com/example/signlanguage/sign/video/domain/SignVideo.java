package com.example.signlanguage.sign.video.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "sign_video")
public class SignVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false, unique = true, length = 255)
    private String storedFilename;

    @Column(name = "storage_url", nullable = false, length = 1000)
    private String storageUrl;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 30)
    private ProcessingStatus processingStatus;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected SignVideo() {
    }

    private SignVideo(
            String originalFilename,
            String storedFilename,
            String storageUrl,
            String contentType,
            long fileSize,
            long durationMs
    ) {
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.storageUrl = storageUrl;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.durationMs = durationMs;
        this.processingStatus = ProcessingStatus.UPLOADED;
        this.uploadedAt = LocalDateTime.now();
        this.updatedAt = this.uploadedAt;
    }

    public static SignVideo uploaded(
            String originalFilename,
            String storedFilename,
            String storageUrl,
            String contentType,
            long fileSize,
            long durationMs
    ) {
        return new SignVideo(originalFilename, storedFilename, storageUrl, contentType, fileSize, durationMs);
    }

    public Long getId() {
        return id;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getStoredFilename() {
        return storedFilename;
    }

    public String getStorageUrl() {
        return storageUrl;
    }

    public String getContentType() {
        return contentType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public Long getDurationMs() {
        return durationMs;
    }

    public ProcessingStatus getProcessingStatus() {
        return processingStatus;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }
}
