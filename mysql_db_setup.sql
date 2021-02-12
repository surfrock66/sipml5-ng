CREATE USER 'svcSipml5Web'@'localhost' IDENTIFIED BY 'defaultPassword';
CREATE DATABASE sipml5_web;
GRANT ALL PRIVILEGES ON 'sipml5_web'.* TO 'svcSipml5Web'@'localhost';
USE sipml5_web;
CREATE TABLE `extensions` (
    `id` INT NOT NULL AUTO_INCREMENT COMMENT 'Unique Auto-Indexing ID',
    `extension` INT NOT NULL COMMENT 'Phone Extension',
    `passcode` INT COMMENT 'Optional Stored Passcode',
    `conversations` JSON COMMENT 'Optional saved chat conversations',
    PRIMARY KEY (`id`)
);
