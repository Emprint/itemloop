<?php

namespace App\Controllers;

use App\Database;
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

        $stmt = $db->prepare('INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_BCRYPT), $role, $status]);
        $userId = (int) $db->lastInsertId();

        if ($status === 'pending') {
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

        if (($user['status'] ?? 'active') === 'pending') {
            return $this->json($response, ['error' => 'ACCOUNT_PENDING', 'message' => 'Your account is pending administrator approval.'], 403);
        }

        $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

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
        $stmt = $db->prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $fresh = $stmt->fetch();

        if (!$fresh) {
            return $this->json($response, ['error' => 'UNAUTHENTICATED'], 401);
        }

        $_SESSION['user'] = $fresh;
        return $this->json($response, ['user' => $fresh]);
    }

    private function fetchUser(\PDO $db, int $id): array
    {
        $stmt = $db->prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
