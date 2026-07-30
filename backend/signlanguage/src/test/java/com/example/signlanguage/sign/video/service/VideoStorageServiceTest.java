package com.example.signlanguage.sign.video.service;

import com.example.signlanguage.global.config.StorageProperties;
import com.example.signlanguage.global.exception.InvalidVideoException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VideoStorageServiceTest {

    @TempDir
    Path tempDirectory;

    @Test
    void storesVideoWithUuidFilename() throws Exception {
        VideoStorageService service = createService();
        MockMultipartFile file = new MockMultipartFile(
                "file", "sample.mp4", "video/mp4", "video-content".getBytes()
        );

        StoredFile storedFile = service.store(file);

        assertThat(storedFile.storedFilename()).endsWith(".mp4").doesNotContain("sample");
        assertThat(Files.readString(storedFile.path())).isEqualTo("video-content");
    }

    @Test
    void rejectsUnsupportedExtension() {
        VideoStorageService service = createService();
        MockMultipartFile file = new MockMultipartFile(
                "file", "sample.exe", "video/mp4", "content".getBytes()
        );

        assertThatThrownBy(() -> service.store(file))
                .isInstanceOf(InvalidVideoException.class)
                .hasMessage("지원하지 않는 영상 확장자입니다.");
    }

    @Test
    void rejectsUnsupportedContentType() {
        VideoStorageService service = createService();
        MockMultipartFile file = new MockMultipartFile(
                "file", "sample.mp4", "application/octet-stream", "content".getBytes()
        );

        assertThatThrownBy(() -> service.store(file))
                .isInstanceOf(InvalidVideoException.class)
                .hasMessage("지원하지 않는 영상 MIME 타입입니다.");
    }

    private VideoStorageService createService() {
        StorageProperties properties = new StorageProperties(
                tempDirectory.toString(),
                1024,
                Set.of("mp4", "mov", "webm"),
                Set.of("video/mp4", "video/quicktime", "video/webm")
        );
        return new VideoStorageService(properties);
    }
}
