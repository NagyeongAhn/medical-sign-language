package com.example.signlanguage.sign.word.service;

import com.example.signlanguage.sign.word.dto.SignWordResponse;
import com.example.signlanguage.sign.word.repository.SignWordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SignWordService {

    private final SignWordRepository signWordRepository;

    public SignWordService(SignWordRepository signWordRepository) {
        this.signWordRepository = signWordRepository;
    }

    @Transactional(readOnly = true)
    public List<SignWordResponse> getActiveWords() {
        return signWordRepository.findAllByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(SignWordResponse::from)
                .toList();
    }
}
