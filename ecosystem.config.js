module.exports = {
  apps: [
    {
      name: "vlh-console",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3002",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};