module.exports = {
  apps: [
    {
      name: "aggiemarket",
      script: "./start.sh",
      interpreter: "/bin/bash",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
