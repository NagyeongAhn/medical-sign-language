package com.example.signlanguage.translation.service;

import com.example.signlanguage.global.exception.InvalidTranslationException;
import com.example.signlanguage.global.exception.SentenceGenerationException;
import com.example.signlanguage.global.exception.TranslationNotFoundException;
import com.example.signlanguage.sign.word.domain.SignWord;
import com.example.signlanguage.sign.word.repository.SignWordRepository;
import com.example.signlanguage.translation.domain.TranslationSession;
import com.example.signlanguage.translation.dto.RecognizedWordRequest;
import com.example.signlanguage.translation.dto.TranslationRequest;
import com.example.signlanguage.translation.dto.TranslationResponse;
import com.example.signlanguage.translation.repository.TranslationSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class TranslationService {

    private final TranslationSessionRepository sessionRepository;
    private final SignWordRepository signWordRepository;
    private final SentenceGenerator sentenceGenerator;

    public TranslationService(
            TranslationSessionRepository sessionRepository,
            SignWordRepository signWordRepository,
            SentenceGenerator sentenceGenerator
    ) {
        this.sessionRepository = sessionRepository;
        this.signWordRepository = signWordRepository;
        this.sentenceGenerator = sentenceGenerator;
    }

    @Transactional
    public TranslationResponse create(TranslationRequest request) {
        TranslationSession session = TranslationSession.pending();
        List<SentenceWord> sentenceWords = new ArrayList<>();

        for (int index = 0; index < request.words().size(); index++) {
            RecognizedWordRequest word = request.words().get(index);
            SignWord signWord = validateSupportedWord(word);
            session.addWord(
                    word.wordId(),
                    word.wordLabel(),
                    index + 1,
                    word.confidence()
            );
            sentenceWords.add(
                    new SentenceWord(
                            signWord.getWordLabel(),
                            signWord.getCategory()
                    )
            );
        }

        try {
            String sentence = sentenceGenerator.generate(sentenceWords);
            session.complete(sentence);
        } catch (SentenceGenerationException exception) {
            session.fail();
        }

        TranslationSession savedSession = sessionRepository.save(session);
        return TranslationResponse.from(savedSession);
    }

    @Transactional(readOnly = true)
    public TranslationResponse getById(long sessionId) {
        TranslationSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new TranslationNotFoundException(sessionId));
        return TranslationResponse.from(session);
    }

    private SignWord validateSupportedWord(RecognizedWordRequest word) {
        SignWord signWord = signWordRepository
                .findByWordIdAndActiveTrue(word.wordId())
                .orElseThrow(() -> new InvalidTranslationException(
                        "지원하지 않는 수어 단어입니다. wordId=" + word.wordId()
                ));

        if (!signWord.getWordLabel().equals(word.wordLabel())) {
            throw new InvalidTranslationException(
                    "단어 ID와 한글 라벨이 일치하지 않습니다. wordId="
                            + word.wordId()
            );
        }
        return signWord;
    }
}
