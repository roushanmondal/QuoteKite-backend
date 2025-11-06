module.exports = {
  apps: [
    {
      name: 'quotekite-backend',
      script: 'dist/server.js', // or whatever your compiled entry point is
      instances: 1,
      watch: false,
      autorestart: true,
      max_memory_restart: '1G',
      interpreter: 'node',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 65432,
      },
    },
  ],
};