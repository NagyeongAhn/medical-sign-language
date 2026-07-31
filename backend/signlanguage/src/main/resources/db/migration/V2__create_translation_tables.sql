CREATE TABLE translation_session (
    id BIGINT NOT NULL AUTO_INCREMENT,
    status VARCHAR(30) NOT NULL,
    generated_sentence VARCHAR(1000) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_translation_session PRIMARY KEY (id)
);

CREATE TABLE recognized_word (
    id BIGINT NOT NULL AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    word_id VARCHAR(50) NOT NULL,
    word_label VARCHAR(100) NOT NULL,
    sequence_order INT NOT NULL,
    confidence DOUBLE NOT NULL,
    CONSTRAINT pk_recognized_word PRIMARY KEY (id),
    CONSTRAINT fk_recognized_word_session
        FOREIGN KEY (session_id) REFERENCES translation_session (id)
        ON DELETE CASCADE,
    CONSTRAINT uk_recognized_word_session_order
        UNIQUE (session_id, sequence_order)
);

CREATE INDEX idx_recognized_word_session_id
    ON recognized_word (session_id);
