<?php
declare(strict_types=1);

// Basic configuration and helpers for API endpoints.

function env_first(array $names, string $default = ''): string {
    foreach ($names as $name) {
        $value = getenv($name);
        if ($value !== false && trim((string)$value) !== '') {
            return trim((string)$value);
        }
    }
    return $default;
}

function setup_config(): array {
    static $cfg = null;
    if (is_array($cfg)) {
        return $cfg;
    }

    $cfg = [];
    $local = __DIR__ . '/setup_config.php';
    if (is_file($local)) {
        $override = include $local;
        if (is_array($override)) {
            $cfg = $override;
        }
    }
    return $cfg;
}

function setup_token(): string {
    $token = env_first(['UGX_SETUP_TOKEN', 'SETUP_TOKEN']);
    if ($token !== '') {
        return $token;
    }

    $cfg = setup_config();
    return isset($cfg['setup_token']) ? trim((string)$cfg['setup_token']) : '';
}

/**
 * CORS that is safe to use WITH credentialed (cookie) requests.
 * Never emits a wildcard origin alongside credentials. Same-origin requests
 * (the normal case for this app) carry no Origin header and need nothing.
 * Cross-origin requests are only honored when they come from the same host.
 */
function enable_cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $originHost = parse_url($origin, PHP_URL_HOST) ?: '';
        if ($host !== '' && $originHost !== '' && strcasecmp($originHost, $host) === 0) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        }
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function get_pdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    // Configure with environment variables or, on Hostinger, create
    // api/db_config.php from db_config_example.txt. Keep real credentials out
    // of the uploadable source tree.
    $cfg = [
        'host' => env_first(['UGX_DB_HOST', 'DB_HOST'], 'localhost'),
        'name' => env_first(['UGX_DB_NAME', 'DB_NAME']),
        'user' => env_first(['UGX_DB_USER', 'DB_USER']),
        'pass' => env_first(['UGX_DB_PASS', 'DB_PASS']),
    ];
    $local = __DIR__ . '/db_config.php';
    if (is_file($local)) {
        $override = include $local;
        if (is_array($override)) {
            $cfg = array_merge($cfg, $override);
        }
    }

    foreach (['host', 'name', 'user'] as $required) {
        if (trim((string)$cfg[$required]) === '') {
            throw new RuntimeException('Database is not configured. Set UGX_DB_HOST, UGX_DB_NAME, UGX_DB_USER, UGX_DB_PASS or create api/db_config.php.');
        }
    }

    $charset = 'utf8mb4';
    $dsn = "mysql:host={$cfg['host']};dbname={$cfg['name']};charset={$charset}";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], $options);
    return $pdo;
}

function json_input(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond_json($payload, int $status = 200): void {
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function ensure_upload_dir(): string {
    $dir = __DIR__ . '/../uploads';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return realpath($dir) ?: $dir;
}

// ---------------------------------------------------------------------------
// Authentication / session helpers
// ---------------------------------------------------------------------------

/**
 * Start a hardened session. Cookie is HttpOnly + SameSite=Lax, and marked
 * Secure automatically when the request is served over HTTPS (directly or via
 * a proxy). Safe to call multiple times per request.
 */
function start_secure_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('ugxpnl_sess');
    session_start();
}

/**
 * Return the current authenticated user, or null.
 * Simple mode: the user object is stored in the session at login by auth.php
 * (no database lookup needed). If you switch back to database-backed users,
 * restore the DB version from _dev_archive/api/config_dbmode.php.
 */
function current_user(): ?array {
    start_secure_session();
    if (empty($_SESSION['user']) || !is_array($_SESSION['user'])) {
        return null;
    }
    $u = $_SESSION['user'];
    $id = (int)($u['id'] ?? 0);
    if ($id > 0) {
        try {
            $pdo = get_pdo();
            $stmt = $pdo->prepare('SELECT id, email, name, role, active FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row || (int)$row['active'] !== 1) {
                unset($_SESSION['user']);
                return null;
            }
            $u = ['id' => (int)$row['id'], 'email' => $row['email'], 'name' => $row['name'], 'role' => $row['role']];
            $_SESSION['user'] = $u;
        } catch (Throwable $e) {
            // If the database is temporarily unavailable, keep the current
            // session object; endpoints that need the DB will still fail safely.
        }
    }
    return $u;
}

/** Require a logged-in user or respond 401 and exit. Returns the user row. */
function require_login(): array {
    $u = current_user();
    if (!$u) {
        respond_json(['success' => false, 'authenticated' => false, 'error' => 'Authentication required'], 401);
    }
    return $u;
}

/** Require an admin user or respond 401/403 and exit. Returns the user row. */
function require_admin(): array {
    $u = require_login();
    if (($u['role'] ?? '') !== 'admin') {
        respond_json(['success' => false, 'error' => 'Admin privileges required'], 403);
    }
    return $u;
}

/**
 * Return the set of column names that actually exist on a table, cached per
 * request. Lets endpoints adapt to schemas that may or may not have run the
 * latest migration (e.g. created_by, settings_json) without 500-ing.
 */
function table_columns(PDO $pdo, string $table): array {
    static $cache = [];
    if (isset($cache[$table])) {
        return $cache[$table];
    }
    $cols = [];
    try {
        // Backtick-safe: only allow word characters in the table name.
        $safe = preg_replace('/[^A-Za-z0-9_]/', '', $table);
        $stmt = $pdo->query("SHOW COLUMNS FROM `{$safe}`");
        foreach ($stmt->fetchAll() as $row) {
            if (isset($row['Field'])) {
                $cols[] = $row['Field'];
            }
        }
    } catch (Throwable $e) {
        $cols = [];
    }
    $cache[$table] = $cols;
    return $cols;
}
