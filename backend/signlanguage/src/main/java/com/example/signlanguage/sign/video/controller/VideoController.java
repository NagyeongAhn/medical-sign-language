package com.example.signlanguage.sign.video.controller;

import com.example.signlanguage.sign.video.domain.SignVideo;
import com.example.signlanguage.sign.video.dto.VideoUploadResponse;
import com.example.signlanguage.sign.video.service.VideoUploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoUploadService videoUploadService;

    public VideoController(VideoUploadService videoUploadService) {
        this.videoUploadService = videoUploadService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VideoUploadResponse> upload(@RequestPart("file") MultipartFile file) {
        SignVideo video = videoUploadService.upload(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(VideoUploadResponse.from(video));
    }

    @GetMapping("/{videoId}")
    public VideoUploadResponse getById(@PathVariable long videoId) {
        return VideoUploadResponse.from(videoUploadService.getById(videoId));
    }
}
