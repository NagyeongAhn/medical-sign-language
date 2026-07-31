package com.example.signlanguage.translation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "recognized_word")
public class RecognizedWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private TranslationSession session;

    @Column(name = "word_id", nullable = false, length = 50)
    private String wordId;

    @Column(name = "word_label", nullable = false, length = 100)
    private String wordLabel;

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Column(nullable = false)
    private double confidence;

    protected RecognizedWord() {
    }

    private RecognizedWord(
            TranslationSession session,
            String wordId,
            String wordLabel,
            int sequenceOrder,
            double confidence
    ) {
        this.session = session;
        this.wordId = wordId;
        this.wordLabel = wordLabel;
        this.sequenceOrder = sequenceOrder;
        this.confidence = confidence;
    }

    public static RecognizedWord of(
            TranslationSession session,
            String wordId,
            String wordLabel,
            int sequenceOrder,
            double confidence
    ) {
        return new RecognizedWord(
                session,
                wordId,
                wordLabel,
                sequenceOrder,
                confidence
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

    public int getSequenceOrder() {
        return sequenceOrder;
    }

    public double getConfidence() {
        return confidence;
    }
}
