<?php

namespace App\Controllers;

use App\Database;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ProductImageController
{
    public function store(Request $request, Response $response, array $args): Response
    {
        $db        = Database::get();
        $productId = (int) $args['id'];

        $stmt = $db->prepare('SELECT id FROM products WHERE id = ?');
        $stmt->execute([$productId]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $files = $request->getUploadedFiles()['images'] ?? [];
        if (!is_array($files)) {
            $files = [$files];
        }

        if (empty($files)) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['images' => ['No images provided.']]], 422);
        }

        $storageDir = __DIR__ . '/../../public/storage/products';
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }

        // Determine next sort_order (append after existing images)
        $countStmt = $db->prepare('SELECT COUNT(*) FROM images WHERE product_id = ?');
        $countStmt->execute([$productId]);
        $nextOrder = (int) $countStmt->fetchColumn();

        $manager       = new ImageManager(new Driver());
        $createdImages = [];

        foreach ($files as $file) {
            if ($file->getError() !== UPLOAD_ERR_OK) {
                continue;
            }

            $mime     = $file->getClientMediaType();
            $allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!in_array($mime, $allowed, true)) {
                return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['images' => ['Only jpeg, png, webp and gif images are allowed.']]], 422);
            }

            $maxBytes = 4 * 1024 * 1024; // 4 MB
            if ($file->getSize() > $maxBytes) {
                return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['images' => ['Each image must be under 4 MB.']]], 422);
            }

            $content = (string) $file->getStream();
            $img     = $manager->read($content);
            $img     = $img->scaleDown(width: 1920, height: 1920);

            $baseName  = pathinfo($file->getClientFilename(), PATHINFO_FILENAME);
            $safeName  = preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseName) . '_' . uniqid();
            $webpName  = $safeName . '.webp';
            $thumbName = $safeName . '_thumb.webp';
            $fullPath  = $storageDir . '/' . $webpName;
            $thumbPath = $storageDir . '/' . $thumbName;

            file_put_contents($fullPath, $img->toWebp(90));

            // Generate thumbnail at max 400×400 px (reuse already-read content)
            $thumb = $manager->read($content);
            $thumb = $thumb->scaleDown(width: 400, height: 400);
            file_put_contents($thumbPath, $thumb->toWebp(80));

            $stmt = $db->prepare(
                'INSERT INTO images (product_id, path, thumbnail_path, format, width, height, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $productId,
                'storage/products/' . $webpName,
                'storage/products/' . $thumbName,
                'webp',
                $img->width(),
                $img->height(),
                $nextOrder++,
            ]);

            $createdImages[] = [
                'id'            => (int) $db->lastInsertId(),
                'url'           => '/storage/products/' . $webpName,
                'thumbnail_url' => '/storage/products/' . $thumbName,
                'path'          => 'storage/products/' . $webpName,
                'thumbnail_path'=> 'storage/products/' . $thumbName,
                'format'        => 'webp',
                'width'         => $img->width(),
                'height'        => $img->height(),
                'sort_order'    => $nextOrder - 1,
            ];
        }

        return $this->json($response, ['images' => $createdImages], 201);
    }

    public function reorder(Request $request, Response $response, array $args): Response
    {
        $db        = Database::get();
        $productId = (int) $args['id'];
        $body      = $request->getParsedBody();
        $ids       = $body['ids'] ?? [];

        if (!is_array($ids) || empty($ids)) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['ids' => ['ids must be a non-empty array.']]], 422);
        }

        $stmt = $db->prepare('UPDATE images SET sort_order = ? WHERE id = ? AND product_id = ?');
        foreach ($ids as $order => $id) {
            $stmt->execute([(int) $order, (int) $id, $productId]);
        }

        return $this->json($response, ['success' => true]);
    }

    public function destroy(Request $request, Response $response, array $args): Response
    {
        $db        = Database::get();
        $productId = (int) $args['id'];
        $imageId   = (int) $args['image_id'];

        $stmt = $db->prepare('SELECT * FROM images WHERE id = ? AND product_id = ?');
        $stmt->execute([$imageId, $productId]);
        $image = $stmt->fetch();

        if (!$image) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $filePath = __DIR__ . '/../../public/' . $image['path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        if (!empty($image['thumbnail_path'])) {
            $thumbFilePath = __DIR__ . '/../../public/' . $image['thumbnail_path'];
            if (file_exists($thumbFilePath)) {
                unlink($thumbFilePath);
            }
        }

        $db->prepare('DELETE FROM images WHERE id = ?')->execute([$imageId]);
        return $this->json($response, ['success' => true]);
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
