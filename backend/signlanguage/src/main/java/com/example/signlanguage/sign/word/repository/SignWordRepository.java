package com.example.signlanguage.sign.word.repository;

import com.example.signlanguage.sign.word.domain.SignWord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SignWordRepository extends JpaRepository<SignWord, Long> {

    List<SignWord> findAllByActiveTrueOrderByDisplayOrderAsc();

    Optional<SignWord> findByWordIdAndActiveTrue(String wordId);
}
