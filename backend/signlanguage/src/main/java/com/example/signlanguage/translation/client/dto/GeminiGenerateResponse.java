package com.example.signlanguage.translation.client.dto;

import java.util.List;

public record GeminiGenerateResponse(
        List<Candidate> candidates
) {

    public String text() {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        Content content = candidates.getFirst().content();
        if (content == null || content.parts() == null || content.parts().isEmpty()) {
            return null;
        }

        return content.parts().getFirst().text();
    }

    public record Candidate(Content content) {
    }

    public record Content(List<Part> parts) {
    }

    public record Part(String text) {
    }
}
