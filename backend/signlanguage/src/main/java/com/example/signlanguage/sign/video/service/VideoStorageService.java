package com.example.signlanguage.sign.video.service;

import com.example.signlanguage.global.config.StorageProperties;
import com.example.signlanguage.global.exception.InvalidVideoException;
import com.example.signlanguage.global.exception.StorageException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class VideoStorageService {

    private final StorageProperties properties;
    private final Path uploadDirectory;

    public VideoStorageService(StorageProperties properties) {
        this.properties = properties;
        this.uploadDirectory = Path.of(properties.uploadDir()).toAbsolutePath().normalize();
        createUploadDirectory();
    }

    public StoredFile store(MultipartFile file) {
        String extension = validate(file);
        String storedFilename = UUID.randomUUID() + "." + extension;
        Path target = uploadDirectory.resolve(storedFilename).normalize();

        if (!target.getParent().equals(uploadDirectory)) {
            throw new InvalidVideoException("올바르지 않은 파일 경로입니다.");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            return new StoredFile(storedFilename, target);
        } catch (IOException exception) {
            throw new StorageException("영상 파일 저장에 실패했습니다.", exception);
        }
    }

    public void deleteQuietly(StoredFile storedFile) {
        try {
            Files.deleteIfExists(storedFile.path());
        } catch (IOException ignored) {
            // DB 저장 실패가 원래 예외를 가리지 않도록 정리 오류는 무시한다.
        }
    }

    private String validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidVideoException("빈 영상 파일은 업로드할 수 없습니다.");
        }
        if (file.getSize() > properties.maxFileSize()) {
            throw new InvalidVideoException("영상 파일은 500MB를 초과할 수 없습니다.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new InvalidVideoException("원본 파일명이 필요합니다.");
        }

        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == originalFilename.length() - 1) {
            throw new InvalidVideoException("영상 파일 확장자가 필요합니다.");
        }

        String extension = originalFilename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
        if (!properties.allowedExtensions().contains(extension)) {
            throw new InvalidVideoException("지원하지 않는 영상 확장자입니다.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !properties.allowedContentTypes().contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new InvalidVideoException("지원하지 않는 영상 MIME 타입입니다.");
        }
        return extension;
    }

    private void createUploadDirectory() {
        try {
            Files.createDirectories(uploadDirectory);
        } catch (IOException exception) {
            throw new StorageException("영상 저장 디렉터리를 생성할 수 없습니다.", exception);
        }
    }
}
