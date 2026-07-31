package com.example.signlanguage.translation.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "translation_session")
public class TranslationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TranslationStatus status;

    @Column(name = "generated_sentence", length = 1000)
    private String generatedSentence;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    private List<RecognizedWord> recognizedWords = new ArrayList<>();

    protected TranslationSession() {
    }

    private TranslationSession(LocalDateTime now) {
        this.status = TranslationStatus.PENDING;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static TranslationSession pending() {
        return new TranslationSession(LocalDateTime.now());
    }

    public void addWord(
            String wordId,
            String wordLabel,
            int sequenceOrder,
            double confidence
    ) {
        recognizedWords.add(
                RecognizedWord.of(
                        this,
                        wordId,
                        wordLabel,
                        sequenceOrder,
                        confidence
                )
        );
    }

    public void complete(String sentence) {
        this.generatedSentence = sentence;
        this.status = TranslationStatus.COMPLETED;
        this.updatedAt = LocalDateTime.now();
    }

    public void fail() {
        this.status = TranslationStatus.FAILED;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public TranslationStatus getStatus() {
        return status;
    }

    public String getGeneratedSentence() {
        return generatedSentence;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<RecognizedWord> getRecognizedWords() {
        return Collections.unmodifiableList(recognizedWords);
    }
}
