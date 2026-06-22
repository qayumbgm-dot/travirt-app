#!/usr/bin/env bash
# deploy/setup.sh — One-time server bootstrap for a fresh Ubuntu 22.04 VPS.
# Run as root: sudo bash deploy/setup.sh
set -euo pipefail

APP_USER=travirt
APP_DIR=/opt/travirt
DOMAIN="${DOMAIN:-yourdomain.com}"
NODE_VERSION=20

echo "==> Installing system dependencies"
apt-get update -qq
apt-get install -y curl git build-essential nginx certbot python3-certbot-nginx \
    postgresql-16 redis-server ufw

# ── Node.js via NodeSource ────────────────────────────────────────────────────
echo "==> Installing Node.js $NODE_VERSION"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
apt-get install -y nodejs

# ── System user for the app ───────────────────────────────────────────────────
if ! id "$APP_USER" &>/dev/null; then
  echo "==> Creating system user: $APP_USER"
  useradd --system --shell /bin/false --create-home --home-dir "$APP_DIR" "$APP_USER"
fi

# ── Directory layout ──────────────────────────────────────────────────────────
mkdir -p "$APP_DIR/backend" "$APP_DIR/frontend" /var/log/travirt /var/www/travirt/dist
chown -R "$APP_USER:$APP_USER" "$APP_DIR" /var/log/travirt /var/www/travirt

# ── PostgreSQL ────────────────────────────────────────────────────────────────
echo "==> Configuring PostgreSQL"
sudo -u postgres psql -c "CREATE USER travirt WITH PASSWORD 'CHANGE_ME_NOW';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE travirt_prod OWNER travirt;" 2>/dev/null || true

# ── Redis ─────────────────────────────────────────────────────────────────────
echo "==> Configuring Redis (bind 127.0.0.1 only)"
sed -i 's/^bind .*/bind 127.0.0.1 -::1/' /etc/redis/redis.conf
systemctl enable --now redis-server

# ── Firewall ──────────────────────────────────────────────────────────────────
echo "==> Configuring UFW firewall"
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

# ── Nginx site ────────────────────────────────────────────────────────────────
echo "==> Installing Nginx config"
sed "s/yourdomain.com/$DOMAIN/g" "$(dirname "$0")/nginx.conf" \
    > "/etc/nginx/sites-available/travirt"
ln -sf /etc/nginx/sites-available/travirt /etc/nginx/sites-enabled/travirt
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── TLS certificate ───────────────────────────────────────────────────────────
echo "==> Obtaining Let's Encrypt certificate for $DOMAIN"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" --redirect || \
    echo "WARN: certbot failed — run manually after DNS propagates"

# ── systemd service ───────────────────────────────────────────────────────────
echo "==> Installing systemd service"
cp "$(dirname "$0")/travirt-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable travirt-backend

# ── Backup infrastructure ─────────────────────────────────────────────────────
echo "==> Setting up backup infrastructure"

# Create backup directory owned by app user
mkdir -p /var/backups/travirt
chown "$APP_USER:$APP_USER" /var/backups/travirt
chmod 750 /var/backups/travirt

# Install backup scripts
cp "$(dirname "$0")/backup.sh"  "$APP_DIR/deploy/backup.sh"
cp "$(dirname "$0")/restore.sh" "$APP_DIR/deploy/restore.sh"
chmod 750 "$APP_DIR/deploy/backup.sh" "$APP_DIR/deploy/restore.sh"
chown "$APP_USER:$APP_USER" "$APP_DIR/deploy/backup.sh" "$APP_DIR/deploy/restore.sh"

# Install cron schedule
cp "$(dirname "$0")/backup.cron" /etc/cron.d/travirt-backup
chown root:root /etc/cron.d/travirt-backup
chmod 644 /etc/cron.d/travirt-backup
echo "==> Backup cron installed: daily at 02:00 IST (20:30 UTC)"

# Ensure aws-cli is available for optional S3 uploads
if ! command -v aws &>/dev/null; then
  echo "INFO: aws CLI not found. Install it if you want S3 backup uploads:"
  echo "      curl -s 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o awscliv2.zip && unzip awscliv2.zip && sudo ./aws/install"
fi

echo ""
echo "==================================================================="
echo " Setup complete. Next steps:"
echo "   1. Copy built backend to $APP_DIR/backend/"
echo "   2. Create $APP_DIR/backend/.env  (copy from backend/.env.example)"
echo "   3. sudo systemctl start travirt-backend"
echo "   4. sudo journalctl -u travirt-backend -f"
echo ""
echo " Backup:"
echo "   Manual run : $APP_DIR/deploy/backup.sh"
echo "   Restore    : $APP_DIR/deploy/restore.sh <file.sql.gz>"
echo "   Logs       : /var/log/travirt/backup.log"
echo "   Storage    : /var/backups/travirt/"
echo "==================================================================="
