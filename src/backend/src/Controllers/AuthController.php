<?php

namespace App\Controllers;

use App\Database;
use App\Services\EmailService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthController
{
    public function register(Request $request, Response $response): Response
    {
        if (!AppSettingsController::isEnabled('open_registration', true)) {
            return $this->json($response, ['error' => 'REGISTRATION_DISABLED'], 403);
        }

        $body = (array) $request->getParsedBody();
        $name     = trim($body['name']     ?? '');
        $email    = trim($body['email']    ?? '');
        $password = $body['password'] ?? '';

        $errors = [];
        if ($name === '')  $errors['name']     = ['The name field is required.'];
        if ($email === '') $errors['email']    = ['The email field is required.'];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = ['The email must be a valid email address.'];
        if (strlen($password) < 8) $errors['password'] = ['The password must be at least 8 characters.'];
        if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/', $password)) {
            $errors['password'] = ['Password must contain at least one letter, one digit, and one special character.'];
        }

        if ($errors) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);
        }

        $db = Database::get();

        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['email' => ['The email has already been taken.']]], 422);
        }

        $count = (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $role  = $count === 0 ? 'admin' : 'customer';

        $publicModeDisabled  = !AppSettingsController::isEnabled('public_mode', true);
        $openRegEnabled      = AppSettingsController::isEnabled('open_registration', true);
        $status = ($publicModeDisabled && $openRegEnabled && $role === 'customer') ? 'pending' : 'active';

        // Detect preferred locale from Accept-Language header (e.g. "fr-FR,fr;q=0.9,en;q=0.8" → "fr")
        $acceptLang = $request->getHeaderLine('Accept-Language');
        $locale     = 'en';
        if ($acceptLang !== '') {
            preg_match('/^([a-zA-Z]{2})/', $acceptLang, $m);
            if (!empty($m[1])) {
                $locale = strtolower($m[1]) === 'fr' ? 'fr' : 'en';
            }
        }

        $stmt = $db->prepare('INSERT INTO users (name, email, password, role, status, locale) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_BCRYPT), $role, $status, $locale]);
        $userId = (int) $db->lastInsertId();

        if ($status === 'pending') {
            // Notify opted-in admins about the new pending registration
            try {
                $appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
                $mailer = new EmailService();
                foreach (EmailService::getAdminRecipients() as $admin) {
                    $mailer->sendTemplate(
                        $admin['email'],
                        $admin['name'],
                        'pending-user-notification',
                        [
                            'newUserName'  => $name,
                            'newUserEmail' => $email,
                            'appUrl'       => $appUrl,
                        ],
                        $admin['locale'] ?? 'en'
                    );
                }
            } catch (\Throwable $e) {
                error_log('AuthController: failed to send pending-user notifications — ' . $e->getMessage());
            }
            return $this->json($response, [
                'registered' => true,
                'pending'    => true,
                'message'    => 'Your account has been created and is pending administrator approval.',
            ], 201);
        }

        $user = $this->fetchUser($db, $userId);
        $_SESSION['user'] = $user;
        session_regenerate_id(true);

        return $this->json($response, ['user' => $user], 201);
    }

    public function login(Request $request, Response $response): Response
    {
        $body     = (array) $request->getParsedBody();
        $email    = trim($body['email']    ?? '');
        $password = $body['password'] ?? '';

        if ($email === '' || $password === '') {
            return $this->json($response, ['error' => 'INVALID_CREDENTIALS'], 401);
        }

        $db   = Database::get();
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            return $this->json($response, ['error' => 'INVALID_CREDENTIALS'], 401);
        }

        if (in_array($user['status'] ?? 'active', ['pending', 'deactivated'])) {
            return $this->json($response, [
                'error' => $user['status'] === 'pending' ? 'ACCOUNT_PENDING' : 'ACCOUNT_DEACTIVATED',
                'message' => $user['status'] === 'pending'
                    ? 'Your account is pending administrator approval.'
                    : 'Your account has been deactivated.',
            ], 403);
        }

        $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

        $user['last_login'] = date('Y-m-d H:i:s');
        unset($user['password']);
        $_SESSION['user'] = $user;
        session_regenerate_id(true);

        return $this->json($response, ['user' => $user]);
    }

    public function logout(Request $request, Response $response): Response
    {
        $_SESSION = [];
        session_destroy();
        return $this->json($response, ['success' => true]);
    }

    public function me(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');

        $db   = Database::get();
        $stmt = $db->prepare('SELECT id, name, email, role, status, locale, created_at, updated_at FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $fresh = $stmt->fetch();

        if (!$fresh) {
            return $this->json($response, ['error' => 'UNAUTHENTICATED'], 401);
        }

        $_SESSION['user'] = $fresh;
        return $this->json($response, ['user' => $fresh]);
    }

    public function forgotPassword(Request $request, Response $response): Response
    {
        $body  = (array) $request->getParsedBody();
        $email = trim($body['email'] ?? '');

        // Always return 200 to prevent email enumeration
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json($response, ['message' => 'If this email exists, a reset link has been sent.']);
        }

        $db   = Database::get();
        $stmt = $db->prepare('SELECT id, name, locale FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            $token = bin2hex(random_bytes(32));
            $db->prepare('INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, NOW())
                          ON DUPLICATE KEY UPDATE token = VALUES(token), created_at = NOW()')
               ->execute([$email, $token]);

            $appUrl   = rtrim($_ENV['APP_URL'] ?? '', '/');
            $resetUrl = $appUrl . '/auth/reset-password?token=' . urlencode($token) . '&email=' . urlencode($email);
            $locale   = $user['locale'] ?? 'en';

            (new EmailService())->sendTemplate(
                $email,
                $user['name'],
                'password-reset',
                ['resetUrl' => $resetUrl, 'userName' => $user['name']],
                $locale
            );
        }

        return $this->json($response, ['message' => 'If this email exists, a reset link has been sent.']);
    }

    public function resetPassword(Request $request, Response $response): Response
    {
        $body     = (array) $request->getParsedBody();
        $email    = trim($body['email']    ?? '');
        $token    = trim($body['token']    ?? '');
        $password = $body['password'] ?? '';

        $errors = [];
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = ['Valid email required.'];
        if ($token === '')    $errors['token']    = ['Token is required.'];
        if (strlen($password) < 8) $errors['password'] = ['Password must be at least 8 characters.'];
        if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/', $password)) {
            $errors['password'] = ['Password must contain at least one letter, one digit, and one special character.'];
        }

        if ($errors) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);
        }

        $db   = Database::get();
        $stmt = $db->prepare('SELECT token, created_at FROM password_reset_tokens WHERE email = ?');
        $stmt->execute([$email]);
        $record = $stmt->fetch();

        if (!$record || $record['token'] !== $token) {
            return $this->json($response, ['error' => 'RESET_LINK_INVALID'], 422);
        }

        $createdAt = strtotime($record['created_at']);
        if (time() - $createdAt > 3600) {
            $db->prepare('DELETE FROM password_reset_tokens WHERE email = ?')->execute([$email]);
            return $this->json($response, ['error' => 'RESET_LINK_EXPIRED'], 422);
        }

        $db->prepare('UPDATE users SET password = ? WHERE email = ?')
           ->execute([password_hash($password, PASSWORD_BCRYPT), $email]);
        $db->prepare('DELETE FROM password_reset_tokens WHERE email = ?')->execute([$email]);

        return $this->json($response, ['message' => 'Password reset successfully.']);
    }

    private function fetchUser(\PDO $db, int $id): array
    {
        $stmt = $db->prepare('SELECT id, name, email, role, status, locale, created_at, updated_at FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
