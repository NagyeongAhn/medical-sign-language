CREATE TABLE sign_word (
    id BIGINT NOT NULL AUTO_INCREMENT,
    word_id VARCHAR(50) NOT NULL,
    word_label VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    recording_key VARCHAR(10) NULL,
    display_order INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_sign_word PRIMARY KEY (id),
    CONSTRAINT uk_sign_word_word_id UNIQUE (word_id),
    CONSTRAINT uk_sign_word_recording_key UNIQUE (recording_key),
    CONSTRAINT uk_sign_word_display_order UNIQUE (display_order)
);

INSERT INTO sign_word (
    word_id,
    word_label,
    category,
    recording_key,
    display_order,
    active,
    created_at,
    updated_at
) VALUES
    ('hospital', '병원', 'PLACE', '1', 1, TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
    ('sick', '아프다', 'SYMPTOM', '2', 2, TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
    ('medicine', '약', 'MEDICINE', '3', 3, TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
    ('doctor', '의사', 'PERSON', '4', 4, TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)),
    ('help', '도와주세요', 'REQUEST', '5', 5, TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));
