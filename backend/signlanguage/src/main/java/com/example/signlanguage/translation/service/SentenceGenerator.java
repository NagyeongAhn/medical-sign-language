package com.example.signlanguage.translation.service;

import java.util.List;

public interface SentenceGenerator {

    String generate(List<SentenceWord> recognizedWords);
}
