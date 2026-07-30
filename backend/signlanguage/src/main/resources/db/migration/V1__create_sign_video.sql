CREATE TABLE sign_video (
    id BIGINT NOT NULL AUTO_INCREMENT,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_url VARCHAR(1000) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    duration_ms BIGINT NULL,
    processing_status VARCHAR(30) NOT NULL,
    uploaded_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_sign_video PRIMARY KEY (id),
    CONSTRAINT uk_sign_video_stored_filename UNIQUE (stored_filename)
);
