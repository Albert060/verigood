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
  ],
};
