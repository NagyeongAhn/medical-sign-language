package com.example.signlanguage.translation.service;

import com.example.signlanguage.translation.client.GeminiClient;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeminiSentenceGenerator implements SentenceGenerator {

    private static final String SYSTEM_INSTRUCTION = """
        너는 의료 현장의 수어 통역 문장 변환기다.

        화자는 항상 치료나 도움을 받으려는 환자다.
        결과 문장은 반드시 환자가 의료진에게 직접 말하는
        1인칭 관점으로 작성한다.

        의사와 간호사 같은 의료진은 환자가 말을 거는 상대방이다.
        '도와주세요'가 포함되면 의료진이 환자를 도와달라는 의미다.
        환자가 의료진을 도와주는 의미로 절대 변환하지 않는다.

        입력은 조사와 일부 문법 요소가 생략된 핵심 단어 목록이다.
        단어 순서와 핵심 의미를 유지하면서 조사, 존칭, 연결어,
        1인칭 대명사와 어미를 자연스럽게 보완한다.

        장소 다음에 의료진이 나오면 해당 장소에 있는 의료진으로
        자연스럽게 연결한다.

        요청은 요청형으로, 질문은 질문형으로 유지한다.
        입력에 없는 증상, 신체 부위, 약품명, 진단명 또는 시간은
        추가하지 않는다.

        설명 없이 환자가 실제로 말하는 자연스러운 문장 하나만 출력한다.
        """;

    private final GeminiClient geminiClient;

    public GeminiSentenceGenerator(GeminiClient geminiClient) {
        this.geminiClient = geminiClient;
    }

    @Override
    public String generate(List<SentenceWord> recognizedWords) {
        String wordsWithCategories = recognizedWords.stream()
                .map(word -> word.label() + "[" + categoryLabel(word) + "]")
                .collect(java.util.stream.Collectors.joining(", "));
        String prompt = "인식 단어: " + wordsWithCategories;
        return geminiClient.generate(SYSTEM_INSTRUCTION, prompt);
    }

    private String categoryLabel(SentenceWord word) {
        return switch (word.category()) {
            case PLACE -> "장소";
            case PERSON -> "사람";
            case BODY_PART -> "신체 부위";
            case SYMPTOM -> "증상";
            case MEDICINE -> "의약품";
            case ACTION -> "행동";
            case REQUEST -> "요청";
            case QUESTION -> "질문";
            case ANSWER -> "응답";
            case NEGATION -> "부정";
            case TIME -> "시간";
            case OTHER -> "기타";
        };
    }
}
