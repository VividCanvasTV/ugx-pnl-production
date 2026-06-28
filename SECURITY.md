# Security Notes

This repository must not contain live credentials.

Ignored server-only files:

- `public_html/api/db_config.php`
- `public_html/api/ghl_config.php`
- `public_html/api/setup_config.php`
- `public_html/config/config.php`
- `.env`

The live Hostinger server should keep `db_config.php` or equivalent environment variables in place so the app can connect to MySQL.

The production zip intentionally excludes setup helpers:

- `api/seed_admin.php`
- `api/setup_check.php`
- `api/setup_config_example.php`

If setup helpers are ever used for recovery, delete them from the live server after login is confirmed.

