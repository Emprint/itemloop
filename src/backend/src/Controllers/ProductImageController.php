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
            // When the request body exceeds post_max_size, PHP discards it entirely: no
            // uploaded files and no POST fields survive, only the Content-Length header.
            // Without this check the request looks like "no image was selected".
            $contentLength = (int) ($request->getServerParams()['CONTENT_LENGTH'] ?? 0);
            $postMax       = self::iniBytes((string) ini_get('post_max_size'));
            if ($contentLength > 0 && $postMax > 0 && $contentLength > $postMax) {
                return $this->json($response, [
                    'error'  => 'UPLOAD_TOO_LARGE',
                    'limit'  => (string) ini_get('post_max_size'),
                    'sent'   => self::formatBytes($contentLength),
                    'errors' => ['images' => [sprintf(
                        'Upload too large for the server: %s sent, but post_max_size is %s.',
                        self::formatBytes($contentLength),
                        (string) ini_get('post_max_size')
                    )]],
                ], 413);
            }

            // The body reached PHP but carried no file. Report enough server-side facts to
            // tell the possible causes apart (uploads disabled, body stripped by a proxy,
            // wrong field name) — these are ini values and counts only, never user data.
            return $this->json($response, [
                'error'       => 'UPLOAD_NO_IMAGE',
                'errors'      => ['images' => ['No images provided.']],
                'diagnostics' => [
                    'content_length'      => $contentLength,
                    'content_type'        => $request->getHeaderLine('Content-Type'),
                    'post_max_size'       => (string) ini_get('post_max_size'),
                    'upload_max_filesize' => (string) ini_get('upload_max_filesize'),
                    'file_uploads'        => (bool) ini_get('file_uploads'),
                    'max_file_uploads'    => (string) ini_get('max_file_uploads'),
                    'upload_tmp_dir'      => (string) ini_get('upload_tmp_dir') ?: sys_get_temp_dir(),
                    'files_keys'          => array_keys($request->getUploadedFiles()),
                    'post_keys'           => array_keys((array) $request->getParsedBody()),
                ],
            ], 422);
        }

        $storageDir = $_ENV['STORAGE_PATH'] ?? __DIR__ . '/../../public/storage/products';
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
            // Never skip a rejected file silently — the client would get 201 with an empty
            // list and show no error at all (typical with phone photos over the PHP limits).
            if ($file->getError() !== UPLOAD_ERR_OK) {
                $tooLarge = in_array($file->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
                return $this->json($response, array_filter([
                    'error'  => $tooLarge ? 'UPLOAD_TOO_LARGE' : 'UPLOAD_FAILED',
                    'limit'  => $tooLarge ? (string) ini_get('upload_max_filesize') : null,
                    'errors' => ['images' => [self::uploadErrorMessage($file->getError())]],
                ]), $tooLarge ? 413 : 422);
            }

            $allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            $content  = (string) $file->getStream();

            // Detect MIME type from actual file content, not the client-supplied header
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime  = $finfo->buffer($content);
            if (!in_array($mime, $allowed, true)) {
                return $this->json($response, [
                    'error'  => 'IMAGE_FORMAT',
                    'got'    => $mime ?: 'unknown',
                    'errors' => ['images' => [sprintf(
                        'Unsupported image format (%s). Allowed: jpeg, png, webp, gif.',
                        $mime ?: 'unknown'
                    )]],
                ], 422);
            }

            $maxBytes = 10 * 1024 * 1024; // 10 MB
            if ($file->getSize() > $maxBytes) {
                return $this->json($response, [
                    'error'  => 'IMAGE_TOO_LARGE',
                    'limit'  => '10 MB',
                    'errors' => ['images' => ['Each image must be under 10 MB.']],
                ], 422);
            }

            $img = $manager->read($content);
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

    // -------------------------------------------------------------------------
    // Upload helpers
    // -------------------------------------------------------------------------

    private static function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE  => sprintf(
                'Image too large for the server: upload_max_filesize is %s.',
                (string) ini_get('upload_max_filesize')
            ),
            UPLOAD_ERR_FORM_SIZE => 'Image too large for this form.',
            UPLOAD_ERR_PARTIAL   => 'The image was only partially uploaded, please retry.',
            UPLOAD_ERR_NO_FILE   => 'No image was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR,
            UPLOAD_ERR_CANT_WRITE => 'The server could not store the image.',
            UPLOAD_ERR_EXTENSION  => 'The upload was blocked by a server extension.',
            default               => 'The image could not be uploaded.',
        };
    }

    // Converts a php.ini shorthand size ("20M", "2G") to bytes.
    private static function iniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }

        $number = (int) $value;

        return match (strtolower($value[strlen($value) - 1])) {
            'g'     => $number * 1024 * 1024 * 1024,
            'm'     => $number * 1024 * 1024,
            'k'     => $number * 1024,
            default => $number,
        };
    }

    private static function formatBytes(int $bytes): string
    {
        return $bytes >= 1024 * 1024
            ? round($bytes / (1024 * 1024), 1) . ' MB'
            : round($bytes / 1024) . ' kB';
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

        $storageBase = $_ENV['STORAGE_PATH'] ?? __DIR__ . '/../../public/storage/products';
        $publicBase  = dirname($storageBase, 2); // parent of "storage/products"

        $filePath = $publicBase . '/' . $image['path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        if (!empty($image['thumbnail_path'])) {
            $thumbFilePath = $publicBase . '/' . $image['thumbnail_path'];
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
