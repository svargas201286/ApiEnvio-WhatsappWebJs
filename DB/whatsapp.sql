-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 10-12-2025 a las 13:34:18
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `whatsapp`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `dispositivos_whatsapp`
--

CREATE TABLE `dispositivos_whatsapp` (
  `id` int(11) NOT NULL,
  `numero` varchar(20) NOT NULL,
  `nombre` varchar(100) DEFAULT 'Dispositivo',
  `estado` enum('conectado','desconectado','conectando') DEFAULT 'desconectado',
  `fecha_conexion` timestamp NULL DEFAULT NULL,
  `fecha_desconexion` timestamp NULL DEFAULT NULL,
  `ultima_actividad` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `instancia_id` varchar(255) DEFAULT NULL,
  `qr_code` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Volcado de datos para la tabla `dispositivos_whatsapp`
--

INSERT INTO `dispositivos_whatsapp` (`id`, `numero`, `nombre`, `estado`, `fecha_conexion`, `fecha_desconexion`, `ultima_actividad`, `instancia_id`, `qr_code`, `created_at`, `updated_at`) VALUES
(1, '51948907640', 'Dispositivo', 'conectando', '2025-10-16 03:35:07', NULL, '2025-12-10 12:34:10', 'NTE5NDg5MDc2NDA=', 'data:image/png;base64,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', '2025-10-16 03:35:07', '2025-12-10 12:34:10'),
(3, '51957369615', 'Dispositivo', 'conectado', '2025-10-16 03:43:09', NULL, '2025-12-10 11:44:01', 'NTE5NTczNjk2MTU=', NULL, '2025-10-16 03:43:09', '2025-12-10 11:44:01');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `numero` varchar(20) NOT NULL,
  `password` varchar(100) NOT NULL,
  `token` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `numero`, `password`, `token`) VALUES
(1, '51948907640', '123456123456', '6a3107bf5356821d38f2d4dd1771203fc501e035b75cc26442ca453a7f8e9814');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `dispositivos_whatsapp`
--
ALTER TABLE `dispositivos_whatsapp`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero` (`numero`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero` (`numero`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `dispositivos_whatsapp`
--
ALTER TABLE `dispositivos_whatsapp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=190;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
