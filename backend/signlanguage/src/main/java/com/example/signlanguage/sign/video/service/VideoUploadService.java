package com.example.signlanguage.sign.video.service;

import com.example.signlanguage.sign.video.domain.SignVideo;
import com.example.signlanguage.sign.video.repository.SignVideoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VideoUploadService {

    private final VideoStorageService storageService;
    private final SignVideoRepository videoRepository;

    public VideoUploadService(VideoStorageService storageService, SignVideoRepository videoRepository) {
        this.storageService = storageService;
        this.videoRepository = videoRepository;
    }

    @Transactional
    public SignVideo upload(MultipartFile file) {
        StoredFile storedFile = storageService.store(file);
        try {
            SignVideo video = SignVideo.uploaded(
                    file.getOriginalFilename(),
                    storedFile.storedFilename(),
                    storedFile.path().toString(),
                    file.getContentType(),
                    file.getSize()
            );
            return videoRepository.save(video);
        } catch (RuntimeException exception) {
            storageService.deleteQuietly(storedFile);
            throw exception;
        }
    }
}
