#!/bin/bash
# Se ejecuta una vez al arrancar cada instancia del Auto Scaling Group.
# Los valores ${...} los reemplaza Terraform (templatefile).
set -xe
exec > >(tee /var/log/user-data.log) 2>&1

dnf install -y nodejs git

git clone --branch ${repo_branch} --depth 1 ${repo_url} /opt/app
cd /opt/app/app
npm ci --omit=dev

cat > /etc/app.env <<'ENVEOF'
PORT=${app_port}
DB_HOST=${db_host}
DB_READ_HOST=${db_read_host}
DB_PORT=5432
DB_NAME=${db_name}
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_SSL=true
ENVEOF
chmod 600 /etc/app.env

cat > /etc/systemd/system/app.service <<'UNITEOF'
[Unit]
Description=DGITI API
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/app/app
EnvironmentFile=/etc/app.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable --now app
