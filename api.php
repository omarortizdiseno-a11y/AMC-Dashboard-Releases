<?php
/*
 * API del portal de gestión "Yo Me Llamo Marc Anthony".
 * Guarda todo en archivos dentro de data/ (protegidos con .htaccess y con
 * un encabezado PHP que impide leerlos desde el navegador).
 * La contraseña se crea en el primer ingreso y se guarda como hash bcrypt.
 */
declare(strict_types=1);

const DATA_DIR = __DIR__ . '/data';
const AUTH_FILE = DATA_DIR . '/auth.php';
const STORE_FILE = DATA_DIR . '/store.php';
const BACKUP_DIR = DATA_DIR . '/backups';
const GUARD = "<?php http_response_code(404); exit; ?>\n";
const MAX_BYTES = 8 * 1024 * 1024;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_name('ymma_portal');
session_start();

function out(int $code, array $data): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_guarded(string $file): ?string
{
    if (!is_file($file)) return null;
    $raw = file_get_contents($file);
    if ($raw === false) return null;
    return str_starts_with($raw, GUARD) ? substr($raw, strlen(GUARD)) : $raw;
}

function write_guarded(string $file, string $content): bool
{
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, GUARD . $content, LOCK_EX) === false) return false;
    return rename($tmp, $file);
}

function ensure_dirs(): void
{
    foreach ([DATA_DIR, BACKUP_DIR] as $d) {
        if (!is_dir($d)) mkdir($d, 0750, true);
    }
    $ht = DATA_DIR . '/.htaccess';
    if (!is_file($ht)) file_put_contents($ht, "Require all denied\nDeny from all\n");
}

function auth_hash(): ?string
{
    $raw = read_guarded(AUTH_FILE);
    if ($raw === null) return null;
    $j = json_decode($raw, true);
    return is_array($j) && !empty($j['hash']) ? $j['hash'] : null;
}

function require_login(): void
{
    if (empty($_SESSION['ok'])) out(401, ['error' => 'Sesión vencida. Ingresa de nuevo.']);
}

function body(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
    if ($raw === false || strlen($raw) > MAX_BYTES) out(413, ['error' => 'Datos demasiado grandes.']);
    $j = json_decode($raw ?: '{}', true);
    return is_array($j) ? $j : [];
}

// Solo peticiones del propio portal (protección básica CSRF)
if (($_SERVER['HTTP_X_PORTAL'] ?? '') !== '1') out(400, ['error' => 'Petición no válida.']);

ensure_dirs();
$action = $_GET['a'] ?? '';

switch ($action) {
    case 'status':
        out(200, ['setup' => auth_hash() === null, 'logged' => !empty($_SESSION['ok'])]);

    case 'setup':
        if (auth_hash() !== null) out(409, ['error' => 'La contraseña ya fue creada.']);
        $b = body();
        $p = (string)($b['password'] ?? '');
        if (mb_strlen($p) < 8) out(400, ['error' => 'La contraseña debe tener al menos 8 caracteres.']);
        if (!write_guarded(AUTH_FILE, json_encode(['hash' => password_hash($p, PASSWORD_DEFAULT), 'created' => date('c')]))) {
            out(500, ['error' => 'No se pudo guardar la contraseña en el servidor.']);
        }
        session_regenerate_id(true);
        $_SESSION['ok'] = true;
        out(200, ['ok' => true]);

    case 'login':
        $h = auth_hash();
        if ($h === null) out(409, ['error' => 'Primero crea la contraseña.']);
        $b = body();
        if (!password_verify((string)($b['password'] ?? ''), $h)) {
            sleep(2);
            out(403, ['error' => 'Contraseña incorrecta.']);
        }
        session_regenerate_id(true);
        $_SESSION['ok'] = true;
        out(200, ['ok' => true]);

    case 'logout':
        $_SESSION = [];
        session_destroy();
        out(200, ['ok' => true]);

    case 'password':
        require_login();
        $b = body();
        $h = auth_hash();
        if (!$h || !password_verify((string)($b['current'] ?? ''), $h)) out(403, ['error' => 'La contraseña actual no es correcta.']);
        $p = (string)($b['password'] ?? '');
        if (mb_strlen($p) < 8) out(400, ['error' => 'La nueva contraseña debe tener al menos 8 caracteres.']);
        write_guarded(AUTH_FILE, json_encode(['hash' => password_hash($p, PASSWORD_DEFAULT), 'created' => date('c')]));
        out(200, ['ok' => true]);

    case 'load':
        require_login();
        $raw = read_guarded(STORE_FILE);
        if ($raw === null) out(200, ['rev' => 0, 'data' => null]);
        $j = json_decode($raw, true);
        out(200, ['rev' => (int)($j['rev'] ?? 0), 'data' => $j['data'] ?? null]);

    case 'save':
        require_login();
        $b = body();
        if (!isset($b['data']) || !is_array($b['data'])) out(400, ['error' => 'Faltan datos.']);
        $fp = fopen(DATA_DIR . '/.lock', 'c');
        flock($fp, LOCK_EX);
        $raw = read_guarded(STORE_FILE);
        $cur = $raw ? json_decode($raw, true) : ['rev' => 0];
        $curRev = (int)($cur['rev'] ?? 0);
        if (empty($b['force']) && (int)($b['rev'] ?? -1) !== $curRev) {
            flock($fp, LOCK_UN);
            out(409, ['error' => 'Los datos cambiaron en otro dispositivo.', 'rev' => $curRev, 'data' => $cur['data'] ?? null]);
        }
        // Copia de respaldo cada hora (se guardan las últimas 48)
        if ($raw) {
            $bk = BACKUP_DIR . '/store-' . date('Ymd-H') . '.php';
            if (!is_file($bk)) {
                write_guarded($bk, $raw);
                $all = glob(BACKUP_DIR . '/store-*.php') ?: [];
                sort($all);
                while (count($all) > 48) unlink(array_shift($all));
            }
        }
        $next = ['rev' => $curRev + 1, 'saved' => date('c'), 'data' => $b['data']];
        $ok = write_guarded(STORE_FILE, json_encode($next, JSON_UNESCAPED_UNICODE));
        flock($fp, LOCK_UN);
        if (!$ok) out(500, ['error' => 'No se pudo guardar en el servidor.']);
        out(200, ['rev' => $next['rev'], 'saved' => $next['saved']]);

    default:
        out(404, ['error' => 'Acción desconocida.']);
}
