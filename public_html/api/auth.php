<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

enable_cors();
start_secure_session();

// Database accounts are the production login source. An emergency fallback can
// be enabled with environment variables, but it is disabled unless explicitly
// configured:
//   UGX_ENABLE_FALLBACK_ADMIN=1
//   UGX_FALLBACK_ADMIN_EMAIL=owner@example.com
//   UGX_FALLBACK_ADMIN_PASSWORD_HASH=<password_hash() output>
//   UGX_FALLBACK_ADMIN_NAME="Owner"

function env_flag(string $name): bool {
    $value = strtolower(trim((string)getenv($name)));
    return in_array($value, ['1', 'true', 'yes', 'on'], true);
}

function fallback_admin_user(string $email, string $pass): ?array {
    if (!env_flag('UGX_ENABLE_FALLBACK_ADMIN')) {
        return null;
    }
    $fallbackEmail = strtolower(trim((string)getenv('UGX_FALLBACK_ADMIN_EMAIL')));
    $fallbackHash = (string)getenv('UGX_FALLBACK_ADMIN_PASSWORD_HASH');
    if ($fallbackEmail === '' || $fallbackHash === '') {
        return null;
    }
    if (!hash_equals($fallbackEmail, $email) || !password_verify($pass, $fallbackHash)) {
        return null;
    }
    $name = trim((string)getenv('UGX_FALLBACK_ADMIN_NAME'));
    return ['id' => 0, 'email' => $fallbackEmail, 'name' => $name !== '' ? $name : 'Fallback Admin', 'role' => 'admin'];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

try {
    // GET ?action=me  -> current session user (or 401)
    if ($method === 'GET' && $action === 'me') {
        $u = current_user();
        if (!$u) {
            respond_json(['success' => false, 'authenticated' => false], 401);
        }
        respond_json(['success' => true, 'authenticated' => true, 'user' => $u]);
    }

    // POST ?action=login
    if ($method === 'POST' && $action === 'login') {
        $in = json_input();
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $pass  = (string)($in['password'] ?? '');
        if ($email === '' || $pass === '') {
            respond_json(['success' => false, 'error' => 'Email and password are required'], 400);
        }

        $user = null;

        // 1) Database accounts (if the DB is configured and the schema exists).
        try {
            $pdo = get_pdo();
            $stmt = $pdo->prepare('SELECT id, email, name, role, active, password_hash FROM users WHERE email = ? LIMIT 1');
            $stmt->execute([$email]);
            $row = $stmt->fetch();
            if ($row && (int)$row['active'] === 1 && password_verify($pass, $row['password_hash'])) {
                $user = ['id' => (int)$row['id'], 'email' => $row['email'], 'name' => $row['name'], 'role' => $row['role']];
            }
        } catch (Throwable $e) {
            // DB not reachable/ready — fall through to the built-in login below.
        }

        // 2) Optional environment-configured emergency fallback admin.
        if ($user === null) {
            $user = fallback_admin_user($email, $pass);
        }

        if ($user === null) {
            respond_json(['success' => false, 'error' => 'Invalid email or password'], 401);
        }

        session_regenerate_id(true);
        $_SESSION['user'] = $user;
        respond_json(['success' => true, 'user' => $user]);
    }

    // POST ?action=logout
    if ($method === 'POST' && $action === 'logout') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        respond_json(['success' => true]);
    }

    // POST ?action=change_password  (database accounts only)
    if ($method === 'POST' && $action === 'change_password') {
        $u = current_user();
        if (!$u) {
            respond_json(['success' => false, 'error' => 'Not signed in'], 401);
        }
        $in = json_input();
        $current = (string)($in['current_password'] ?? '');
        $new     = (string)($in['new_password'] ?? '');
        if (strlen($new) < 8) {
            respond_json(['success' => false, 'error' => 'New password must be at least 8 characters'], 400);
        }
        try {
            $pdo = get_pdo();
            $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([(int)$u['id']]);
            $row = $stmt->fetch();
            if (!$row || !password_verify($current, $row['password_hash'])) {
                respond_json(['success' => false, 'error' => 'Current password is incorrect'], 400);
            }
            $hash = password_hash($new, PASSWORD_DEFAULT);
            $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, (int)$u['id']]);
            respond_json(['success' => true]);
        } catch (Throwable $e) {
            respond_json(['success' => false, 'error' => 'Password changes are available for database accounts after the database is configured.'], 400);
        }
    }

    respond_json(['success' => false, 'error' => 'Unknown action'], 400);
} catch (Throwable $e) {
    respond_json(['success' => false, 'error' => 'Server error'], 500);
}
