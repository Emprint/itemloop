<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController
{
    private const ALLOWED_ROLES = ['admin', 'editor', 'member', 'customer'];

    public function index(Request $request, Response $response): Response
    {
        $rows = Database::get()
            ->query('SELECT id, name, email, role, status, created_at, updated_at, last_login FROM users ORDER BY name')
            ->fetchAll();

        return $this->json($response, $rows);
    }

    public function pending(Request $request, Response $response): Response
    {
        $rows = Database::get()
            ->query("SELECT id, name, email, role, status, created_at, updated_at, last_login FROM users WHERE status = 'pending' ORDER BY created_at DESC")
            ->fetchAll();

        return $this->json($response, $rows);
    }

    public function pendingCount(Request $request, Response $response): Response
    {
        $count = Database::get()
            ->query("SELECT COUNT(*) as count FROM users WHERE status = 'pending'")
            ->fetch()['count'] ?? 0;

        return $this->json($response, ['count' => (int) $count]);
    }

    public function validate(Request $request, Response $response): Response
    {
        $id = $request->getAttribute('id');
        if (!$id) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }
        $db = Database::get();
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND status = 'pending'");
        $stmt->execute([(int) $id]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $stmt = $db->prepare("UPDATE users SET status = 'active', updated_at = NOW() WHERE id = ?");
        $stmt->execute([(int) $id]);

        $stmt = $db->prepare('SELECT id, name, email, role, status, created_at, updated_at, last_login FROM users WHERE id = ?');
        $stmt->execute([(int) $id]);
        $user = $stmt->fetch();

        return $this->json($response, $user);
    }

    public function deactivate(Request $request, Response $response): Response
    {
        $id = $request->getAttribute('id');
        if (!$id) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }
        $db = Database::get();
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
        $stmt->execute([(int) $id]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $stmt = $db->prepare("UPDATE users SET status = 'pending', updated_at = NOW() WHERE id = ?");
        $stmt->execute([(int) $id]);

        $stmt = $db->prepare('SELECT id, name, email, role, status, created_at, updated_at, last_login FROM users WHERE id = ?');
        $stmt->execute([(int) $id]);
        $user = $stmt->fetch();

        return $this->json($response, $user);
    }

    public function save(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $body = (array) $request->getParsedBody();

        $id       = isset($body['id']) && $body['id'] ? (int) $body['id'] : null;
        $name     = trim($body['name']  ?? '');
        $email    = trim($body['email'] ?? '');
        $role     = $body['role']       ?? 'customer';
        $password = $body['password']   ?? '';

        $errors = [];
        if ($name === '')  $errors['name']  = ['The name field is required.'];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = ['A valid email is required.'];
        if (!in_array($role, self::ALLOWED_ROLES, true)) $errors['role'] = ['Invalid role.'];
        if (!$id && strlen($password) < 8) $errors['password'] = ['Password must be at least 8 characters.'];
        if (!$id && !preg_match('/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/', $password)) {
            $errors['password'] = ['Password must contain at least one letter, one digit, and one special character.'];
        }

        if ($errors) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);
        }

        if ($id) {
            $stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
            $stmt->execute([$id]);
            if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

            $stmt = $db->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
            $stmt->execute([$email, $id]);
            if ($stmt->fetch()) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['email' => ['Email already in use.']]], 422);

            if ($password !== '') {
                $db->prepare('UPDATE users SET name = ?, email = ?, role = ?, password = ?, updated_at = NOW() WHERE id = ?')
                   ->execute([$name, $email, $role, password_hash($password, PASSWORD_BCRYPT), $id]);
            } else {
                $db->prepare('UPDATE users SET name = ?, email = ?, role = ?, updated_at = NOW() WHERE id = ?')
                   ->execute([$name, $email, $role, $id]);
            }
        } else {
            $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->execute([$email]);
            if ($stmt->fetch()) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['email' => ['Email already in use.']]], 422);

            $db->prepare('INSERT INTO users (name, email, role, password, created_at) VALUES (?, ?, ?, ?, NOW())')
               ->execute([$name, $email, $role, password_hash($password, PASSWORD_BCRYPT)]);
            $id = (int) $db->lastInsertId();
        }

        $stmt = $db->prepare('SELECT id, name, email, role, status, created_at, updated_at, last_login FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $this->json($response, $stmt->fetch());
    }

    public function delete(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $body = (array) $request->getParsedBody();
        $id   = (int) ($body['id'] ?? 0);

        if (!$id) return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['id' => ['User ID is required.']]], 422);

        $currentUser = $request->getAttribute('user');
        if ((int) $currentUser['id'] === $id) {
            return $this->json($response, ['error' => 'FORBIDDEN', 'message' => 'You cannot delete your own account.'], 403);
        }

        $stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) return $this->json($response, ['error' => 'NOT_FOUND'], 404);

        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        return $this->json($response, ['success' => true]);
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}