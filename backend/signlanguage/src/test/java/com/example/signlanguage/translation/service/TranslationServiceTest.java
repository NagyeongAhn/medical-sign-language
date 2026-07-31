package com.example.signlanguage.translation.service;

import com.example.signlanguage.global.exception.InvalidTranslationException;
import com.example.signlanguage.global.exception.SentenceGenerationException;
import com.example.signlanguage.sign.word.domain.SignWord;
import com.example.signlanguage.sign.word.domain.SignWordCategory;
import com.example.signlanguage.sign.word.repository.SignWordRepository;
import com.example.signlanguage.translation.domain.TranslationSession;
import com.example.signlanguage.translation.domain.TranslationStatus;
import com.example.signlanguage.translation.dto.RecognizedWordRequest;
import com.example.signlanguage.translation.dto.TranslationRequest;
import com.example.signlanguage.translation.dto.TranslationResponse;
import com.example.signlanguage.translation.repository.TranslationSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TranslationServiceTest {

    @Mock
    private TranslationSessionRepository sessionRepository;

    @Mock
    private SignWordRepository signWordRepository;

    @Mock
    private SentenceGenerator sentenceGenerator;

    @InjectMocks
    private TranslationService translationService;

    @Test
    void createsCompletedSessionWithGeneratedSentenceAndRecognizedWordOrder() {
        when(sessionRepository.save(any(TranslationSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(sentenceGenerator.generate(List.of(
                new SentenceWord("아프다", SignWordCategory.SYMPTOM),
                new SentenceWord("병원", SignWordCategory.PLACE),
                new SentenceWord("도와주세요", SignWordCategory.REQUEST)
        )))
                .thenReturn("아파서 병원에 왔습니다. 도와주세요.");
        supportWord("sick", "아프다", SignWordCategory.SYMPTOM, "2", 2);
        supportWord("hospital", "병원", SignWordCategory.PLACE, "1", 1);
        supportWord("help", "도와주세요", SignWordCategory.REQUEST, "5", 5);

        TranslationRequest request = new TranslationRequest(
                List.of(
                        new RecognizedWordRequest("sick", "아프다", 0.83),
                        new RecognizedWordRequest("hospital", "병원", 0.82),
                        new RecognizedWordRequest("help", "도와주세요", 0.79)
                )
        );

        TranslationResponse response = translationService.create(request);

        ArgumentCaptor<TranslationSession> captor =
                ArgumentCaptor.forClass(TranslationSession.class);
        verify(sessionRepository).save(captor.capture());
        TranslationSession savedSession = captor.getValue();

        assertThat(response.status()).isEqualTo(TranslationStatus.COMPLETED);
        assertThat(response.generatedSentence())
                .isEqualTo("아파서 병원에 왔습니다. 도와주세요.");
        assertThat(savedSession.getRecognizedWords())
                .extracting("sequenceOrder")
                .containsExactly(1, 2, 3);
        assertThat(response.words())
                .extracting("wordLabel")
                .containsExactly("아프다", "병원", "도와주세요");
    }

    @Test
    void savesFailedSessionWhenSentenceGenerationFails() {
        when(sessionRepository.save(any(TranslationSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(sentenceGenerator.generate(List.of(
                new SentenceWord("의사", SignWordCategory.PERSON),
                new SentenceWord("도와주세요", SignWordCategory.REQUEST)
        )))
                .thenThrow(new SentenceGenerationException("API 오류"));
        supportWord("doctor", "의사", SignWordCategory.PERSON, "4", 4);
        supportWord("help", "도와주세요", SignWordCategory.REQUEST, "5", 5);

        TranslationRequest request = new TranslationRequest(
                List.of(
                        new RecognizedWordRequest("doctor", "의사", 0.82),
                        new RecognizedWordRequest("help", "도와주세요", 0.79)
                )
        );

        TranslationResponse response = translationService.create(request);

        assertThat(response.status()).isEqualTo(TranslationStatus.FAILED);
        assertThat(response.generatedSentence()).isNull();
        assertThat(response.words())
                .extracting("wordLabel")
                .containsExactly("의사", "도와주세요");
        verify(sessionRepository).save(any(TranslationSession.class));
    }

    @Test
    void rejectsUnsupportedWord() {
        TranslationRequest request = new TranslationRequest(
                List.of(
                        new RecognizedWordRequest("unknown", "모름", 0.7)
                )
        );

        assertThatThrownBy(() -> translationService.create(request))
                .isInstanceOf(InvalidTranslationException.class)
                .hasMessageContaining("지원하지 않는");

        verify(sessionRepository, never()).save(any());
        verify(sentenceGenerator, never()).generate(any());
    }

    @Test
    void rejectsMismatchedWordLabel() {
        supportWord("hospital", "병원", SignWordCategory.PLACE, "1", 1);

        TranslationRequest request = new TranslationRequest(
                List.of(
                        new RecognizedWordRequest("hospital", "약", 0.8)
                )
        );

        assertThatThrownBy(() -> translationService.create(request))
                .isInstanceOf(InvalidTranslationException.class)
                .hasMessageContaining("일치하지 않습니다");

        verify(sessionRepository, never()).save(any());
        verify(sentenceGenerator, never()).generate(any());
    }

    private void supportWord(
            String wordId,
            String wordLabel,
            SignWordCategory category,
            String recordingKey,
            int displayOrder
    ) {
        SignWord signWord = SignWord.create(
                wordId,
                wordLabel,
                category,
                recordingKey,
                displayOrder
        );
        when(signWordRepository.findByWordIdAndActiveTrue(wordId))
                .thenReturn(Optional.of(signWord));
    }
}
