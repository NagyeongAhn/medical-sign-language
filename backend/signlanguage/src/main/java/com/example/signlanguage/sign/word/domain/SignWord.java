package com.example.signlanguage.sign.word.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "sign_word")
public class SignWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "word_id", nullable = false, unique = true, length = 50)
    private String wordId;

    @Column(name = "word_label", nullable = false, length = 100)
    private String wordLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SignWordCategory category;

    @Column(name = "recording_key", unique = true, length = 10)
    private String recordingKey;

    @Column(name = "display_order", nullable = false, unique = true)
    private int displayOrder;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected SignWord() {
    }

    private SignWord(
            String wordId,
            String wordLabel,
            SignWordCategory category,
            String recordingKey,
            int displayOrder,
            boolean active,
            LocalDateTime now
    ) {
        this.wordId = wordId;
        this.wordLabel = wordLabel;
        this.category = category;
        this.recordingKey = recordingKey;
        this.displayOrder = displayOrder;
        this.active = active;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static SignWord create(
            String wordId,
            String wordLabel,
            SignWordCategory category,
            String recordingKey,
            int displayOrder
    ) {
        return new SignWord(
                wordId,
                wordLabel,
                category,
                recordingKey,
                displayOrder,
                true,
                LocalDateTime.now()
        );
    }

    public Long getId() {
        return id;
    }

    public String getWordId() {
        return wordId;
    }

    public String getWordLabel() {
        return wordLabel;
    }

    public SignWordCategory getCategory() {
        return category;
    }

    public String getRecordingKey() {
        return recordingKey;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public boolean isActive() {
        return active;
    }
}
