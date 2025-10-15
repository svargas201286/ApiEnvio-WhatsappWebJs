#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando sistema WhatsApp...');

// Verificar que existe el archivo main.js
if (!fs.existsSync('./main.js')) {
  console.error('❌ Error: No se encontró main.js');
  process.exit(1);
}

// Verificar dependencias
console.log('📦 Verificando dependencias...');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const requiredDeps = ['express', 'whatsapp-web.js', 'mysql2', 'qrcode'];

for (const dep of requiredDeps) {
  if (!packageJson.dependencies[dep]) {
    console.error(`❌ Error: Falta la dependencia ${dep}`);
    process.exit(1);
  }
}

console.log('✅ Dependencias verificadas');

// Función para reiniciar el proceso si falla
function startProcess() {
  console.log('🔄 Iniciando proceso principal...');
  
  const child = spawn('node', ['main.js'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  child.on('error', (error) => {
    console.error('❌ Error al iniciar proceso:', error);
    console.log('🔄 Reintentando en 5 segundos...');
    setTimeout(startProcess, 5000);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`⚠️  Proceso terminado por señal: ${signal}`);
    } else if (code !== 0) {
      console.log(`❌ Proceso terminado con código: ${code}`);
      console.log('🔄 Reintentando en 5 segundos...');
      setTimeout(startProcess, 5000);
    } else {
      console.log('✅ Proceso terminado normalmente');
    }
  });

  // Manejo de señales del sistema
  process.on('SIGTERM', () => {
    console.log('🛑 Recibida señal SIGTERM, cerrando...');
    child.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🛑 Recibida señal SIGINT, cerrando...');
    child.kill('SIGINT');
    process.exit(0);
  });
}

// Iniciar el proceso
startProcess();
