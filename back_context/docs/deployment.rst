Deployment Guide
================

This guide summarizes the recommended steps to run the FastAPI service in a production environment.

Prerequisites
-------------

* Python 3.11 or newer.
* Access to the Minecraft server host and the batch script that boots the world.
* Proper firewall/NAT configuration pointing a public port to the host.

Environment variables
---------------------

Set the required configuration before starting the service::

   export MINECRAFT_START_SCRIPT=/opt/minecraft/start.sh
   export MINECRAFT_SERVER_ROOT=/opt/minecraft/server
   export MINECRAFT_MODS_ARCHIVE=/opt/minecraft/distribution/mods.zip
   export MINECRAFT_NEOFORGE_INSTALLER=/opt/minecraft/distribution/neoforge-21.5.95-installer.jar
   export APP_HOST=0.0.0.0
   export APP_PORT=8000
   export CORS_ALLOWED_ORIGINS=https://naseevvee.duckdns.org

Process supervision with systemd
--------------------------------

Create ``/etc/systemd/system/minecraft-backend.service``::

   [Unit]
   Description=Minecraft server API
   After=network.target

   [Service]
   User=minecraft
   Group=minecraft
   WorkingDirectory=/opt/minecraft/backend
   EnvironmentFile=/opt/minecraft/backend/.env
   ExecStart=/usr/bin/python -m uvicorn minecraft_server_backend.main:app --host ${APP_HOST} --port ${APP_PORT}
   Restart=always

   [Install]
   WantedBy=multi-user.target

Reload the systemd daemon and enable the service::

   sudo systemctl daemon-reload
   sudo systemctl enable --now minecraft-backend

Reverse proxy
-------------

Expose the API through Nginx to add TLS and rate limiting::

   server {
       listen 80;
       server_name naseevvee.duckdns.org;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

Enable HTTPS with Let's Encrypt or your preferred certificate manager.

Monitoring
----------

Use the new ``GET /api/server/status`` endpoint for automation scripts and configure your external monitoring platform to alert when it reports ``{"running": false}``.
