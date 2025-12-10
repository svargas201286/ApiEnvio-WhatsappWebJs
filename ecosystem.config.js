module.exports = {
  apps: [{
    name: 'whatsapp-api',
    script: './main.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Reiniciar automáticamente si falla
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // Configuración de inicio automático
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: false
  }]
};
