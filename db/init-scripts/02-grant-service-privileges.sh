#!/bin/sh
set -eu

case "$MYSQL_DATABASE" in
  ""|*[!A-Za-z0-9_]*) echo "MYSQL_DATABASE must use letters, numbers, and underscores" >&2; exit 1 ;;
esac
case "$MYSQL_USER" in
  ""|*[!A-Za-z0-9_]*) echo "MYSQL_USER must use letters, numbers, and underscores" >&2; exit 1 ;;
esac
case "$MYSQL_EXPORTER_PASSWORD" in
  ""|*[!A-Za-z0-9_-]*) echo "MYSQL_EXPORTER_PASSWORD must use letters, numbers, underscores, or hyphens" >&2; exit 1 ;;
esac

mysql --protocol=socket -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '$MYSQL_USER'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`$MYSQL_DATABASE\`.* TO '$MYSQL_USER'@'%';
CREATE USER IF NOT EXISTS 'gallery_exporter'@'%' IDENTIFIED BY '$MYSQL_EXPORTER_PASSWORD';
ALTER USER 'gallery_exporter'@'%' IDENTIFIED BY '$MYSQL_EXPORTER_PASSWORD';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'gallery_exporter'@'%';
SQL
