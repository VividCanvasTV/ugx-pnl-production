<?php
declare(strict_types=1);

/**
 * Admin-only user management.
 *   GET    /api/users.php            -> list users
 *   POST   /api/users.php            -> create user {email,name,password,role}
 *   PUT    /api/users.php?id=N       -> update {name?,role?,active?}
 *   POST   /api/users.php?action=reset_password&id=N -> {password}
 *   DELETE /api/users.php?id=N       -> deactivate (soft delete)
 */

require __DIR__ . '/config.php';

enable_cors();
$admin = require_admin();
$pdo = get_pdo();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

function user_public(array $u): array {
    return [
        'id' => (int)$u['id'],
        'email' => $u['email'],
        'name' => $u['name'],
        'role' => $u['role'],
        'active' => (int)$u['active'],
        'created_at' => $u['created_at'] ?? null,
    ];
}

try {
    if ($method === 'GET') {
        $rows = $pdo->query('SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at ASC')->fetchAll();
        respond_json(['success' => true, 'users' => array_map('user_public', $rows)]);
    }

    if ($method === 'POST' && $action === 'reset_password') {
        $id = (int)($_GET['id'] ?? 0);
        $in = json_input();
        $new = (string)($in['password'] ?? '');
        if ($id <= 0) respond_json(['success' => false, 'error' => 'Missing id'], 400);
        if (strlen($new) < 8) respond_json(['success' => false, 'error' => 'Password must be at least 8 characters'], 400);
        $hash = password_hash($new, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$hash, $id]);
        respond_json(['success' => true]);
    }

    if ($method === 'POST') {
        $in = json_input();
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $name  = trim((string)($in['name'] ?? ''));
        $pass  = (string)($in['password'] ?? '');
        $role  = ($in['role'] ?? 'user') === 'admin' ? 'admin' : 'user';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond_json(['success' => false, 'error' => 'Valid email required'], 400);
        }
        if (strlen($pass) < 8) {
            respond_json(['success' => false, 'error' => 'Password must be at least 8 characters'], 400);
        }
        // Unique email check
        $chk = $pdo->prepare('SELECT COUNT(1) AS c FROM users WHERE email = ?');
        $chk->execute([$email]);
        if ((int)$chk->fetch()['c'] > 0) {
            respond_json(['success' => false, 'error' => 'A user with that email already exists'], 409);
        }
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, name, role, active) VALUES (?, ?, ?, ?, 1)');
        $stmt->execute([$email, $hash, $name !== '' ? $name : $email, $role]);
        $id = (int)$pdo->lastInsertId();
        respond_json(['success' => true, 'id' => $id], 201);
    }

    if ($method === 'PUT') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) respond_json(['success' => false, 'error' => 'Missing id'], 400);
        $in = json_input();
        $fields = [];
        $params = [];
        if (isset($in['name']))   { $fields[] = 'name = ?';   $params[] = trim((string)$in['name']); }
        if (isset($in['role']))   { $fields[] = 'role = ?';   $params[] = ($in['role'] === 'admin' ? 'admin' : 'user'); }
        if (isset($in['active'])) { $fields[] = 'active = ?'; $params[] = ((int)!!$in['active']); }
        if (!$fields) respond_json(['success' => false, 'error' => 'Nothing to update'], 400);
        // Guard: don't let an admin demote/deactivate the last active admin (themselves included).
        if ((isset($in['role']) && $in['role'] !== 'admin') || (isset($in['active']) && !$in['active'])) {
            $target = $pdo->prepare('SELECT role, active FROM users WHERE id = ?');
            $target->execute([$id]);
            $t = $target->fetch();
            if ($t && $t['role'] === 'admin') {
                $cnt = (int)$pdo->query("SELECT COUNT(1) AS c FROM users WHERE role='admin' AND active=1")->fetch()['c'];
                if ($cnt <= 1) {
                    respond_json(['success' => false, 'error' => 'Cannot remove the last active admin'], 400);
                }
            }
        }
        $params[] = $id;
        $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);
        respond_json(['success' => true]);
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) respond_json(['success' => false, 'error' => 'Missing id'], 400);
        if ($id === (int)$admin['id']) {
            respond_json(['success' => false, 'error' => 'You cannot deactivate your own account'], 400);
        }
        // Don't deactivate the last active admin.
        $target = $pdo->prepare('SELECT role FROM users WHERE id = ?');
        $target->execute([$id]);
        $t = $target->fetch();
        if ($t && $t['role'] === 'admin') {
            $cnt = (int)$pdo->query("SELECT COUNT(1) AS c FROM users WHERE role='admin' AND active=1")->fetch()['c'];
            if ($cnt <= 1) {
                respond_json(['success' => false, 'error' => 'Cannot deactivate the last active admin'], 400);
            }
        }
        $stmt = $pdo->prepare('UPDATE users SET active = 0 WHERE id = ?');
        $stmt->execute([$id]);
        respond_json(['success' => true]);
    }

    respond_json(['success' => false, 'error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    respond_json(['success' => false, 'error' => 'Server error'], 500);
}
