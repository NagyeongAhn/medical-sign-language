package com.example.signlanguage.translation.controller;

import com.example.signlanguage.translation.dto.TranslationRequest;
import com.example.signlanguage.translation.dto.TranslationResponse;
import com.example.signlanguage.translation.service.TranslationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/translations")
public class TranslationController {

    private final TranslationService translationService;

    public TranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    @PostMapping
    public ResponseEntity<TranslationResponse> create(
            @Valid @RequestBody TranslationRequest request
    ) {
        TranslationResponse response = translationService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{sessionId}")
    public TranslationResponse getById(@PathVariable long sessionId) {
        return translationService.getById(sessionId);
    }
}
