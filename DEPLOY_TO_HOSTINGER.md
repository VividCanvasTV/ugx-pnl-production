# Deploy To Hostinger

Use this path for the existing live `ugxpnls.com` site.

1. Back up Hostinger `public_html`.
2. Confirm `public_html/api/db_config.php` exists on Hostinger.
3. Upload `deployment/ugxpnl-production-live.zip`.
4. Extract it directly inside `public_html`.
5. Overwrite existing code files when Hostinger asks.
6. Delete the uploaded zip from Hostinger after extraction.
7. Delete these old setup files from `public_html/api` if present:
   - `seed_admin.php`
   - `setup_check.php`
   - `setup_config.php`
   - `setup_config_example.php`
8. Confirm `https://ugxpnls.com/api/health.php` returns database `ok`.

Do not re-import `deployment/database.sql` for the existing live site. Use it only for a fresh database build or recovery.

