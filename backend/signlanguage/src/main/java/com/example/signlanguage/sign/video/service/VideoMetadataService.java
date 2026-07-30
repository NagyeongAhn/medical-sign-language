package com.example.signlanguage.sign.video.service;

import com.example.signlanguage.global.exception.InvalidVideoException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class VideoMetadataService {

    private final String ffprobeCommand;
    private final long timeoutSeconds;

    public VideoMetadataService(
            @Value("${app.media.ffprobe-command:ffprobe}") String ffprobeCommand,
            @Value("${app.media.probe-timeout-seconds:10}") long timeoutSeconds
    ) {
        this.ffprobeCommand = ffprobeCommand;
        this.timeoutSeconds = timeoutSeconds;
    }

    public long extractDurationMs(Path videoPath) {
        Process process = null;
        try {
            process = new ProcessBuilder(
                    ffprobeCommand,
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    videoPath.toString()
            ).redirectErrorStream(true).start();

            boolean completed = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                throw new InvalidVideoException("영상 정보 분석 시간이 초과되었습니다.");
            }

            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            if (process.exitValue() != 0 || output.isBlank()) {
                throw new InvalidVideoException("재생 가능한 영상 파일이 아닙니다.");
            }

            long durationMs = new BigDecimal(output)
                    .multiply(BigDecimal.valueOf(1000))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValueExact();
            if (durationMs <= 0) {
                throw new InvalidVideoException("영상 재생시간은 0보다 커야 합니다.");
            }
            return durationMs;
        } catch (IOException exception) {
            throw new IllegalStateException("ffprobe를 실행할 수 없습니다.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("영상 정보 분석이 중단되었습니다.", exception);
        } catch (NumberFormatException | ArithmeticException exception) {
            throw new InvalidVideoException("영상 재생시간을 확인할 수 없습니다.");
        } finally {
            if (process != null) {
                process.destroy();
            }
        }
    }
}
