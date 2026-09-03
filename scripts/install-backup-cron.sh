#!/usr/bin/env bash
set -euo pipefail
SCRIPT="/var/www/handytech/HandyTech-Website/scripts/backup-production.sh"
chmod 750 "$SCRIPT"
(crontab -l 2>/dev/null | grep -v 'backup-production.sh' || true; echo '20 3 * * * /var/www/handytech/HandyTech-Website/scripts/backup-production.sh >> /var/log/handytech-backup.log 2>&1') | crontab -
echo "Daily HandyTech backup scheduled for 3:20 AM server time."
