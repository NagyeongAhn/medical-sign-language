package com.example.signlanguage.translation.client;

import com.example.signlanguage.global.config.GeminiProperties;
import com.example.signlanguage.global.exception.SentenceGenerationException;
import com.example.signlanguage.translation.client.dto.GeminiGenerateRequest;
import com.example.signlanguage.translation.client.dto.GeminiGenerateResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;

@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final GeminiProperties properties;
    private final RestClient restClient;

    public GeminiClient(GeminiProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(
                Duration.ofSeconds(properties.connectTimeoutSeconds())
        );
        requestFactory.setReadTimeout(
                Duration.ofSeconds(properties.readTimeoutSeconds())
        );
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    public String generate(String systemInstruction, String userPrompt) {
        validateConfiguration();
        long startedAt = System.nanoTime();

        try {
            GeminiGenerateResponse response = restClient.post()
                    .uri("/models/{model}:generateContent", properties.model())
                    .header("x-goog-api-key", properties.apiKey())
                    .body(GeminiGenerateRequest.of(systemInstruction, userPrompt))
                    .retrieve()
                    .body(GeminiGenerateResponse.class);

            if (response == null || !StringUtils.hasText(response.text())) {
                throw new SentenceGenerationException(
                        "Gemini가 생성 문장을 반환하지 않았습니다."
                );
            }

            String sentence = response.text().trim();
            log.info(
                    "Gemini 문장 생성 완료: {}ms",
                    elapsedMilliseconds(startedAt)
            );
            return sentence;
        } catch (SentenceGenerationException exception) {
            throw exception;
        } catch (RestClientException exception) {
            log.warn(
                    "Gemini API 호출 실패: {}ms",
                    elapsedMilliseconds(startedAt),
                    exception
            );
            throw new SentenceGenerationException(
                    "Gemini API 호출에 실패했습니다.",
                    exception
            );
        }
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(properties.apiKey())) {
            throw new SentenceGenerationException(
                    "GEMINI_API_KEY가 설정되지 않았습니다."
            );
        }
        if (!StringUtils.hasText(properties.baseUrl())
                || !StringUtils.hasText(properties.model())) {
            throw new SentenceGenerationException(
                    "Gemini API 설정이 올바르지 않습니다."
            );
        }
        if (properties.connectTimeoutSeconds() <= 0
                || properties.readTimeoutSeconds() <= 0) {
            throw new SentenceGenerationException(
                    "Gemini API 제한 시간 설정이 올바르지 않습니다."
            );
        }
    }

    private long elapsedMilliseconds(long startedAt) {
        return Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
    }
}
