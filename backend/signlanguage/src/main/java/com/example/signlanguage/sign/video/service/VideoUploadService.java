package com.example.signlanguage.sign.video.service;

import com.example.signlanguage.global.exception.VideoNotFoundException;
import com.example.signlanguage.sign.video.domain.SignVideo;
import com.example.signlanguage.sign.video.repository.SignVideoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VideoUploadService {

    private final VideoStorageService storageService;
    private final VideoMetadataService metadataService;
    private final SignVideoRepository videoRepository;

    public VideoUploadService(
            VideoStorageService storageService,
            VideoMetadataService metadataService,
            SignVideoRepository videoRepository
    ) {
        this.storageService = storageService;
        this.metadataService = metadataService;
        this.videoRepository = videoRepository;
    }

    @Transactional
    public SignVideo upload(MultipartFile file) {
        StoredFile storedFile = storageService.store(file);
        try {
            long durationMs = metadataService.extractDurationMs(storedFile.path());
            SignVideo video = SignVideo.uploaded(
                    file.getOriginalFilename(),
                    storedFile.storedFilename(),
                    storedFile.path().toString(),
                    file.getContentType(),
                    file.getSize(),
                    durationMs
            );
            return videoRepository.save(video);
        } catch (RuntimeException exception) {
            storageService.deleteQuietly(storedFile);
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public SignVideo getById(long videoId) {
        return videoRepository.findById(videoId)
                .orElseThrow(() -> new VideoNotFoundException(videoId));
    }
}
