package com.example.signlanguage.translation.repository;

import com.example.signlanguage.translation.domain.TranslationSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TranslationSessionRepository extends JpaRepository<TranslationSession, Long> {
}
