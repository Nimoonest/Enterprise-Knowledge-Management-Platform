CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
  review_status ENUM('draft', 'pending_review', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
  created_by VARCHAR(100) NOT NULL,
  updated_by VARCHAR(100) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  file_object_key VARCHAR(768) NULL,
  file_name VARCHAR(255) NULL,
  file_type VARCHAR(255) NULL,
  file_size BIGINT UNSIGNED NULL,
  file_uploaded_at DATETIME(3) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_documents_status_updated (review_status, updated_at),
  KEY idx_documents_category_updated (category, updated_at),
  FULLTEXT KEY ft_documents_title_summary (title, summary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS document_tags (
  document_id VARCHAR(64) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (document_id, tag),
  KEY idx_document_tags_tag (tag),
  CONSTRAINT fk_document_tags_document
    FOREIGN KEY (document_id) REFERENCES documents(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
