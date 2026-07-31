package com.example.signlanguage.sign.word.service;

import com.example.signlanguage.sign.word.domain.SignWord;
import com.example.signlanguage.sign.word.domain.SignWordCategory;
import com.example.signlanguage.sign.word.dto.SignWordResponse;
import com.example.signlanguage.sign.word.repository.SignWordRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SignWordServiceTest {

    @Mock
    private SignWordRepository signWordRepository;

    @Test
    void returnsActiveWordsInRepositoryOrder() {
        SignWord hospital = SignWord.create(
                "hospital",
                "병원",
                SignWordCategory.PLACE,
                "1",
                1
        );
        SignWord doctor = SignWord.create(
                "doctor",
                "의사",
                SignWordCategory.PERSON,
                "4",
                4
        );
        when(signWordRepository.findAllByActiveTrueOrderByDisplayOrderAsc())
                .thenReturn(List.of(hospital, doctor));

        SignWordService service = new SignWordService(signWordRepository);

        List<SignWordResponse> words = service.getActiveWords();

        assertThat(words)
                .extracting(SignWordResponse::wordId)
                .containsExactly("hospital", "doctor");
        assertThat(words.getFirst().recordingKey()).isEqualTo("1");
        assertThat(words.getFirst().category())
                .isEqualTo(SignWordCategory.PLACE);
    }
}
