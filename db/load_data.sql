USE product_knowledge;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE product_knowledge_chunks;
TRUNCATE TABLE product_relations;
TRUNCATE TABLE product_images;
TRUNCATE TABLE product_categories;
TRUNCATE TABLE products;
SET FOREIGN_KEY_CHECKS = 1;

LOAD DATA LOCAL INFILE 'db/products.csv'
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

LOAD DATA LOCAL INFILE 'db/product_categories.csv'
INTO TABLE product_categories
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(sku, sort_order, category_path);

LOAD DATA LOCAL INFILE 'db/product_images.csv'
INTO TABLE product_images
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(sku, sort_order, url);

LOAD DATA LOCAL INFILE 'db/product_relations.csv'
INTO TABLE product_relations
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(sku, relation_type, sort_order, related_text);

LOAD DATA LOCAL INFILE 'db/product_knowledge_chunks.csv'
INTO TABLE product_knowledge_chunks
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(chunk_id, sku, title, content, keywords);
