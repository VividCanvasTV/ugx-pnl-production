<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

enable_cors();

$dbOk = false;
try {
    $pdo = get_pdo();
    $pdo->query('SELECT 1');
    $dbOk = true;
} catch (Throwable $e) {
    $dbOk = false;
}

respond_json([
    'status' => $dbOk ? 'ok' : 'error',
    'database' => $dbOk ? 'ok' : 'unavailable',
    'time' => time(),
], $dbOk ? 200 : 503);

