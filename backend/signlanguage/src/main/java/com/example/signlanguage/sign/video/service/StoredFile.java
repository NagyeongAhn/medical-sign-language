package com.example.signlanguage.sign.video.service;

import java.nio.file.Path;

public record StoredFile(
        String storedFilename,
        Path path
) {
}
