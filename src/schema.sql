-- Пости та теги пов'язані зв'язком "багато до багатьох" через post_tags.
-- Час зберігається в UTC. Без крапок з комою всередині коментарів: файл ділиться по ним.

CREATE TABLE IF NOT EXISTS posts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  content    MEDIUMTEXT   NOT NULL,
  category   VARCHAR(100) NOT NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
  updated_at DATETIME(3)  NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
  INDEX idx_posts_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- utf8mb4_bin: порівняння точне. У стандартного utf8mb4_0900_ai_ci "café" = "cafe", "кїт" = "кіт", "й" = "и",
-- і тег мовчки злився б з іншим. Регістр нормалізує застосунок (нижній регістр).
CREATE TABLE IF NOT EXISTS tags (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Міграція для баз, створених зі старою схемою. Для вже виправленої таблиці нічого не змінює.
ALTER TABLE tags MODIFY name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INT UNSIGNED NOT NULL,
  tag_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  INDEX idx_post_tags_tag (tag_id),
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
