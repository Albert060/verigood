// PM2 ecosystem config
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'verigood-backend',
      script: './backend/src/index.js',
      cwd: '/var/www/verigood',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Logging
      out_file: '/var/log/verigood/backend-out.log',
      error_file: '/var/log/verigood/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart policy
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 1000,
      max_restarts: 10,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      // Cron semanal: resumen para el admin + aviso de profes inactivos +
      // limpieza de notificaciones antiguas. Corre en proceso aparte y sale.
      // PM2 lo relanza según cron_restart.
      name: 'verigood-digest',
      script: './backend/src/jobs/weeklyDigest.js',
      cwd: '/var/www/verigood',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      cron_restart: '0 8 * * 1', // lunes 08:00 (server TZ; fijar TZ=Europe/Madrid en env_production)
      env: { NODE_ENV: 'development' },
      env_production: { NODE_ENV: 'production', TZ: 'Europe/Madrid' },
      out_file: '/var/log/verigood/digest-out.log',
      error_file: '/var/log/verigood/digest-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
