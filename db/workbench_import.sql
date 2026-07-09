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

USE product_knowledge;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE product_knowledge_chunks;
TRUNCATE TABLE product_relations;
TRUNCATE TABLE product_images;
TRUNCATE TABLE product_categories;
TRUNCATE TABLE products;
SET FOREIGN_KEY_CHECKS = 1;

LOAD DATA LOCAL INFILE 'D:/Enterprise-Knowledge-Management-Platform/db/products.csv'
INTO TABLE products
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(sku, name, subtitle, product_type, scent, @price, @market_price, @stock, @status, @engraving_available, @review_count, category_path, @image_count, url_key, detail_url, description, inspiration, usage_advice, features, craft, formula_texture, ingredients, details, editorial_content)
SET
  price = NULLIF(@price, ''),
  market_price = NULLIF(@market_price, ''),
  stock = NULLIF(@stock, ''),
  status = NULLIF(@status, ''),
  engraving_available = NULLIF(@engraving_available, ''),
  review_count = NULLIF(@review_count, ''),
  image_count = NULLIF(@image_count, '');

LOAD DATA LOCAL INFILE 'D:/Enterprise-Knowledge-Management-Platform/db/product_categories.csv'
INTO TABLE product_categories
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(sku, sort_order, category_path);

LOAD DATA LOCAL INFILE 'D:/Enterprise-Knowledge-Management-Platform/db/product_images.csv'
INTO TABLE product_images
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(sku, sort_order, url);

LOAD DATA LOCAL INFILE 'D:/Enterprise-Knowledge-Management-Platform/db/product_relations.csv'
INTO TABLE product_relations
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(sku, relation_type, sort_order, related_text);

LOAD DATA LOCAL INFILE 'D:/Enterprise-Knowledge-Management-Platform/db/product_knowledge_chunks.csv'
INTO TABLE product_knowledge_chunks
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(chunk_id, sku, title, content, keywords);


SELECT COUNT(*) AS products FROM product_knowledge.products;
SELECT COUNT(*) AS categories FROM product_knowledge.product_categories;
SELECT COUNT(*) AS images FROM product_knowledge.product_images;
SELECT COUNT(*) AS relations FROM product_knowledge.product_relations;
SELECT COUNT(*) AS chunks FROM product_knowledge.product_knowledge_chunks;

