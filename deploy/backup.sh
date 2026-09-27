#!/bin/sh
# Copies the database and scans into a dated archive. Stops the app briefly so the
# database file is consistent. Example cron entry (root, nightly at 3:15):
#   15 3 * * * /opt/beihilfe-manager/backup.sh /media/usb/beihilfe-backups
set -eu

target=${1:?usage: backup.sh <backup directory>}
mkdir -p "$target"
systemctl stop beihilfe-manager
trap 'systemctl start beihilfe-manager' EXIT
tar -czf "$target/beihilfe-$(date +%Y-%m-%d).tar.gz" -C /var/lib beihilfe-manager
# Keep the last 30 backups.
ls -1t "$target"/beihilfe-*.tar.gz | tail -n +31 | xargs -r rm --
