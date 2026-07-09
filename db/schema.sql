CREATE DATABASE IF NOT EXISTS product_knowledge
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE product_knowledge;

CREATE TABLE IF NOT EXISTS products (
  sku VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NULL,
  product_type VARCHAR(80) NULL,
  scent VARCHAR(255) NULL,
  price DECIMAL(10,2) NULL,
  market_price DECIMAL(10,2) NULL,
  stock INT NULL,
  status TINYINT NULL,
  engraving_available TINYINT NULL,
  review_count INT NULL,
  category_path TEXT NULL,
  image_count INT NULL,
  url_key VARCHAR(255) NULL,
  detail_url VARCHAR(512) NULL,
  description MEDIUMTEXT NULL,
  inspiration MEDIUMTEXT NULL,
  usage_advice MEDIUMTEXT NULL,
  features MEDIUMTEXT NULL,
  craft MEDIUMTEXT NULL,
  formula_texture MEDIUMTEXT NULL,
  ingredients MEDIUMTEXT NULL,
  details MEDIUMTEXT NULL,
  editorial_content MEDIUMTEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY ft_products_text (
    name,
    subtitle,
    scent,
    description,
    inspiration,
    usage_advice,
    features,
    details
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL,
  category_path VARCHAR(512) NOT NULL,
  KEY idx_product_categories_sku (sku),
  CONSTRAINT fk_product_categories_product
    FOREIGN KEY (sku) REFERENCES products(sku)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL,
  url VARCHAR(1024) NOT NULL,
  KEY idx_product_images_sku (sku),
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (sku) REFERENCES products(sku)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_relations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(64) NOT NULL,
  relation_type ENUM('pairing', 'related', 'cross_sell', 'upgrade') NOT NULL,
  sort_order INT NOT NULL,
  related_text VARCHAR(1024) NOT NULL,
  KEY idx_product_relations_sku_type (sku, relation_type),
  CONSTRAINT fk_product_relations_product
    FOREIGN KEY (sku) REFERENCES products(sku)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_knowledge_chunks (
  chunk_id VARCHAR(96) PRIMARY KEY,
  sku VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  keywords JSON NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_product_chunks_sku (sku),
  FULLTEXT KEY ft_product_chunks_content (title, content),
  CONSTRAINT fk_product_chunks_product
    FOREIGN KEY (sku) REFERENCES products(sku)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
