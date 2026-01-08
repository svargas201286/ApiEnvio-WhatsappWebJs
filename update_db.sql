-- ACTUALIZACIÓN CRÍTICA DE BASE DE DATOS
-- Ejecuta esto en phpMyAdmin o tu gestor de BD seleccionado la base de datos 'whatsapp_api'

-- 1. Ampliar capacidad para guardar PDFs grandes (Base64)
ALTER TABLE `cola_mensajes` MODIFY `media_url` LONGTEXT;

-- 2. Añadir columnas para nombre de archivo y tipo MIME (para soportar XML, PDF, etc.)
ALTER TABLE `cola_mensajes` ADD COLUMN `filename` VARCHAR(255) NULL AFTER `media_url`;
ALTER TABLE `cola_mensajes` ADD COLUMN `mimetype` VARCHAR(100) NULL AFTER `filename`;
