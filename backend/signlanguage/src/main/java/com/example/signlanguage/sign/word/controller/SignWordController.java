package com.example.signlanguage.sign.word.controller;

import com.example.signlanguage.sign.word.dto.SignWordResponse;
import com.example.signlanguage.sign.word.service.SignWordService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sign-words")
public class SignWordController {

    private final SignWordService signWordService;

    public SignWordController(SignWordService signWordService) {
        this.signWordService = signWordService;
    }

    @GetMapping
    public List<SignWordResponse> getActiveWords() {
        return signWordService.getActiveWords();
    }
}
