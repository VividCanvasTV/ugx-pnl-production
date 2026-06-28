<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

enable_cors();
$user = require_login();           // <-- jobs are now private; must be logged in
$pdo = get_pdo();
$isAdmin = (($user['role'] ?? '') === 'admin');

// Universal shared projects: when true, every logged-in user sees and can edit
// ALL jobs — not just the ones they created. Set to false to restore per-user
// privacy. Either way, created_by is still recorded so you can see who made each.
$shareAll = true;

// Keep deletes tighter than shared viewing/editing so a second device/user cannot
// accidentally wipe jobs that were created on the phone or by another user.
$allowSharedDelete = false;

// Adapt to whatever columns the live schema actually has, so this works before
// and after the optional migration (created_by, settings_json, measurement_json).
$cols = table_columns($pdo, 'jobs');
$hasCreatedBy = in_array('created_by', $cols, true);
$hasSettings  = in_array('settings_json', $cols, true);
$hasMeasure   = in_array('measurement_json', $cols, true);
$hasStartDate = in_array('start_date', $cols, true);
$hasEndDate   = in_array('end_date', $cols, true);
$hasYearly    = in_array('yearly_breakdown_json', $cols, true);
$hasGrand     = in_array('grand_total', $cols, true);

$method = $_SERVER['REQUEST_METHOD'];

/** Decode the JSON blob columns on a job row into arrays. */
function decode_job_row(array $job): array {
    $decode = function ($value): array {
        $decoded = !empty($value) ? json_decode((string)$value, true) : [];
        return is_array($decoded) ? $decoded : [];
    };
    $job['materials'] = $decode($job['materials_json'] ?? null);
    $job['labor']     = $decode($job['labor_json'] ?? null);
    $job['other']     = $decode($job['other_json'] ?? null);
    if (array_key_exists('settings_json', $job)) {
        $job['settings'] = $decode($job['settings_json'] ?? null);
    }
    if (array_key_exists('measurement_json', $job)) {
        $decoded = !empty($job['measurement_json']) ? json_decode((string)$job['measurement_json'], true) : null;
        $job['measurement'] = is_array($decoded) ? $decoded : null;
    }
    if (array_key_exists('yearly_breakdown_json', $job)) {
        $job['yearly_breakdown'] = $decode($job['yearly_breakdown_json'] ?? null);
    }
    unset($job['materials_json'], $job['labor_json'], $job['other_json'], $job['settings_json'], $job['measurement_json'], $job['yearly_breakdown_json']);
    return $job;
}

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM jobs WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $job = $stmt->fetch();
        if (!$job) {
            respond_json(['success' => false, 'error' => 'Not found'], 404);
        }
        // Ownership check: when sharing is off, a non-admin may only open their own jobs.
        if (!$shareAll && !$isAdmin && $hasCreatedBy && $job['created_by'] !== null && (int)$job['created_by'] !== (int)$user['id']) {
            respond_json(['success' => false, 'error' => 'Forbidden'], 403);
        }
        respond_json(['success' => true, 'job' => decode_job_row($job)]);
    } else {
        $select = ['id', 'job_name', 'company_name', 'job_type', 'date', 'total_cost', 'price', 'net_profit', 'updated_at'];
        if ($hasStartDate) $select[] = 'start_date';
        if ($hasEndDate) $select[] = 'end_date';
        if ($hasGrand) $select[] = 'grand_total';
        if (in_array('total_sales_tax', $cols, true)) $select[] = 'total_sales_tax';
        foreach (['ghl_contact_id', 'ghl_opportunity_id', 'ghl_estimate_id', 'ghl_last_synced_at', 'ghl_last_sync_error'] as $ghlCol) {
            if (in_array($ghlCol, $cols, true)) $select[] = $ghlCol;
        }
        $sql = 'SELECT ' . implode(', ', $select)
             . ($hasCreatedBy ? ', created_by' : '')
             . ' FROM jobs';
        $params = [];
        if (!$shareAll && !$isAdmin && $hasCreatedBy) {
            $sql .= ' WHERE created_by = ?';
            $params[] = (int)$user['id'];
        }
        $sql .= ' ORDER BY updated_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        respond_json(['success' => true, 'jobs' => $stmt->fetchAll()]);
    }
}

if ($method === 'POST' || $method === 'PUT') {
    $data = json_input();
    $requestedId = isset($data['id']) && is_string($data['id']) ? $data['id'] : '';
    $id = preg_match('/^[A-Za-z0-9_-]{1,64}$/', $requestedId)
        ? $requestedId
        : (string)('job_' . bin2hex(random_bytes(8)));
    $companyName = trim((string)($data['companyName'] ?? ''));
    $jobName = trim((string)($data['jobName'] ?? ''));
    $jobType = trim((string)($data['jobType'] ?? 'Other'));
    if ($companyName === '' || $jobName === '') {
        respond_json(['success' => false, 'error' => 'Missing required fields'], 400);
    }

    // Does this job already exist, and who owns it?
    $existsStmt = $pdo->prepare('SELECT * FROM jobs WHERE id = ?');
    $existsStmt->execute([$id]);
    $existing = $existsStmt->fetch();
    if ($existing && !$shareAll && !$isAdmin && $hasCreatedBy && $existing['created_by'] !== null
        && (int)$existing['created_by'] !== (int)$user['id']) {
        respond_json(['success' => false, 'error' => 'Forbidden'], 403);
    }

    $startDate = isset($data['startDate']) && $data['startDate'] !== '' ? (string)$data['startDate'] : null;
    $endDate = isset($data['endDate']) && $data['endDate'] !== '' ? (string)$data['endDate'] : null;
    $date = isset($data['date']) && $data['date'] !== '' ? (string)$data['date'] : $startDate;
    $validDate = function (?string $value): bool {
        return $value === null || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1;
    };
    if (!$validDate($date) || !$validDate($startDate) || !$validDate($endDate)) {
        respond_json(['success' => false, 'error' => 'Invalid date format'], 400);
    }
    if ($startDate !== null && $endDate !== null && strcmp($endDate, $startDate) < 0) {
        respond_json(['success' => false, 'error' => 'End date cannot be before start date'], 400);
    }
    $yearlyBreakdown = is_array($data['yearlyBreakdown'] ?? null) ? $data['yearlyBreakdown'] : [];
    if (count($yearlyBreakdown) > 1) {
        $yearlyTotal = 0;
        foreach ($yearlyBreakdown as $pct) {
            $yearlyTotal += (int)$pct;
        }
        if ($yearlyTotal !== 100) {
            respond_json(['success' => false, 'error' => 'Yearly breakdown must total 100%'], 400);
        }
    }

    // Optional logo handling (base64 upload or path).
    $logoPath = null;
    if (!empty($data['logo_base64']) && is_string($data['logo_base64'])) {
        $uploadsDir = ensure_upload_dir();
        if (preg_match('/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/', $data['logo_base64'], $m)) {
            $ext = $m[1] === 'jpeg' ? 'jpg' : $m[1];
            $bin = base64_decode($m[2], true);
            if ($bin !== false && strlen($bin) <= 5 * 1024 * 1024) {
                $filename = $id . '_' . time() . '.' . $ext;
                file_put_contents($uploadsDir . DIRECTORY_SEPARATOR . $filename, $bin);
                $logoPath = 'uploads/' . $filename;
            }
        }
    } elseif (!empty($data['logo_path']) && is_string($data['logo_path'])) {
        $candidate = $data['logo_path'];
        if (preg_match('/^uploads\/[A-Za-z0-9_.-]+\.(png|jpe?g|webp)$/i', $candidate)) {
            $logoPath = $candidate;
        }
    }

    // Build the desired field => value map. Intersected with real columns below.
    $fields = [
        'company_name'        => $companyName,
        'job_name'            => $jobName,
        'job_type'            => $jobType,
        'date'                => $date,
        'start_date'          => $startDate,
        'end_date'            => $endDate,
        'profit_margin'       => (float)($data['profitMargin'] ?? 0),
        'overhead_cost'       => (float)($data['overheadCost'] ?? 0),
        'overhead_percent'    => (float)($data['overheadPercent'] ?? 0),
        'sales_tax_percent'   => (float)($data['salesTaxPercent'] ?? 0),
        'contingency_percent' => (float)($data['contingencyPercent'] ?? 0),
        'profit_mode'         => (string)($data['profitMode'] ?? 'margin'),
        'rounding_step'       => (int)($data['roundingStep'] ?? 0),
        'notes'               => (string)($data['notes'] ?? ''),
        'materials_json'      => json_encode(is_array($data['materials'] ?? null) ? $data['materials'] : [], JSON_UNESCAPED_UNICODE),
        'labor_json'          => json_encode(is_array($data['labor'] ?? null) ? $data['labor'] : [], JSON_UNESCAPED_UNICODE),
        'other_json'          => json_encode(is_array($data['other'] ?? null) ? $data['other'] : [], JSON_UNESCAPED_UNICODE),
        'total_materials'     => (float)($data['totalMaterials'] ?? 0),
        'total_labor'         => (float)($data['totalLabor'] ?? 0),
        'total_other'         => (float)($data['totalOther'] ?? 0),
        'total_overhead'      => (float)($data['totalOverhead'] ?? 0),
        'total_sales_tax'     => (float)($data['totalSalesTax'] ?? 0),
        'total_contingency'   => (float)($data['totalContingency'] ?? 0),
        'total_cost'          => (float)($data['totalCost'] ?? 0),
        'price'               => (float)($data['price'] ?? 0),
        'net_profit'          => (float)($data['netProfit'] ?? 0),
        'grand_total'         => (float)($data['grandTotal'] ?? (($data['price'] ?? 0) + ($data['totalSalesTax'] ?? 0))),
    ];
    if ($hasYearly) {
        $fields['yearly_breakdown_json'] = json_encode($yearlyBreakdown, JSON_UNESCAPED_UNICODE);
    }
    if ($hasSettings) {
        $settings = is_array($data['settings'] ?? null) ? $data['settings'] : [
            'taxBase'      => (string)($data['taxBase'] ?? 'materials'),
            'overheadBase' => (string)($data['overheadBase'] ?? 'matlabor'),
        ];
        $fields['settings_json'] = json_encode($settings, JSON_UNESCAPED_UNICODE);
    }
    if ($hasMeasure && array_key_exists('measurement', $data)) {
        $fields['measurement_json'] = $data['measurement'] !== null
            ? json_encode($data['measurement'], JSON_UNESCAPED_UNICODE)
            : null;
    }

    // Keep only columns that truly exist in this schema.
    $fields = array_intersect_key($fields, array_flip($cols));

    if ($existing) {
        // UPDATE. Preserve existing logo unless a new one was provided.
        $setParts = [];
        $params = [];
        foreach ($fields as $col => $val) {
            $setParts[] = "`{$col}` = ?";
            $params[] = $val;
        }
        if (in_array('logo_path', $cols, true)) {
            $setParts[] = '`logo_path` = COALESCE(?, logo_path)';
            $params[] = $logoPath;
        }
        if (in_array('updated_at', $cols, true)) {
            $setParts[] = '`updated_at` = NOW()';
        }
        $params[] = $id;
        $sql = 'UPDATE jobs SET ' . implode(', ', $setParts) . ' WHERE id = ?';
        $pdo->prepare($sql)->execute($params);
    } else {
        // INSERT. Set id, owner, and logo on creation.
        $fields = ['id' => $id] + $fields;
        if (in_array('logo_path', $cols, true)) {
            $fields['logo_path'] = $logoPath;
        }
        if ($hasCreatedBy) {
            $fields['created_by'] = (int)$user['id'];
        }
        $colNames = array_keys($fields);
        $placeholders = array_fill(0, count($colNames), '?');
        $colList = '`' . implode('`, `', $colNames) . '`';
        $tail = '';
        if (in_array('created_at', $cols, true)) { $colList .= ', `created_at`'; $tail .= ', NOW()'; }
        if (in_array('updated_at', $cols, true)) { $colList .= ', `updated_at`'; $tail .= ', NOW()'; }
        $sql = "INSERT INTO jobs ({$colList}) VALUES (" . implode(', ', $placeholders) . $tail . ')';
        $pdo->prepare($sql)->execute(array_values($fields));
    }

    respond_json(['success' => true, 'id' => $id, 'logo_path' => $logoPath]);
}

if ($method === 'DELETE') {
    if (!isset($_GET['id'])) {
        respond_json(['success' => false, 'error' => 'Missing id'], 400);
    }
    // Ownership check before deleting.
    if ((!$shareAll || !$allowSharedDelete) && !$isAdmin && $hasCreatedBy) {
        $own = $pdo->prepare('SELECT created_by FROM jobs WHERE id = ?');
        $own->execute([$_GET['id']]);
        $row = $own->fetch();
        if ($row && $row['created_by'] !== null && (int)$row['created_by'] !== (int)$user['id']) {
            respond_json(['success' => false, 'error' => 'Forbidden'], 403);
        }
    }
    $stmt = $pdo->prepare('DELETE FROM jobs WHERE id = ?');
    $stmt->execute([$_GET['id']]);
    respond_json(['success' => true]);
}

respond_json(['success' => false, 'error' => 'Method not allowed'], 405);
