package com.example.signlanguage.sign.video.service;

import com.example.signlanguage.global.exception.InvalidVideoException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VideoMetadataServiceTest {

    @TempDir
    Path tempDirectory;

    @Test
    void convertsDurationSecondsToMilliseconds() throws Exception {
        Path fakeProbe = createFakeProbe("1.234567", 0);
        VideoMetadataService service = new VideoMetadataService(fakeProbe.toString(), 3);

        long durationMs = service.extractDurationMs(tempDirectory.resolve("sample.mp4"));

        assertThat(durationMs).isEqualTo(1235);
    }

    @Test
    void rejectsFileWhenProbeFails() throws Exception {
        Path fakeProbe = createFakeProbe("invalid video", 1);
        VideoMetadataService service = new VideoMetadataService(fakeProbe.toString(), 3);

        assertThatThrownBy(() -> service.extractDurationMs(tempDirectory.resolve("broken.mp4")))
                .isInstanceOf(InvalidVideoException.class)
                .hasMessage("재생 가능한 영상 파일이 아닙니다.");
    }

    private Path createFakeProbe(String output, int exitCode) throws Exception {
        Path script = tempDirectory.resolve("fake-ffprobe-" + exitCode);
        Files.writeString(script, "#!/bin/sh\nprintf '%s\\n' '" + output + "'\nexit " + exitCode + "\n");
        if (!script.toFile().setExecutable(true)) {
            throw new IllegalStateException("테스트용 ffprobe 파일에 실행 권한을 설정할 수 없습니다.");
        }
        return script;
    }
}
