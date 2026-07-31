package com.example.signlanguage.translation.repository;

import com.example.signlanguage.translation.domain.RecognizedWord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecognizedWordRepository extends JpaRepository<RecognizedWord, Long> {

    List<RecognizedWord> findAllBySessionIdOrderBySequenceOrder(Long sessionId);
}
