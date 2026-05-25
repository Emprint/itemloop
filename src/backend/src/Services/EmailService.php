<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as MailerException;

/**
 * Thin wrapper around PHPMailer.
 *
 * Configuration is read from environment variables (MAIL_*).
 * If MAIL_HOST is empty, all send calls are silently skipped — useful for local dev.
 */
class EmailService
{
    private string $host;
    private int    $port;
    private string $encryption;
    private string $user;
    private string $pass;
    private string $from;
    private string $fromName;

    public function __construct()
    {
        $this->host       = $_ENV['MAIL_HOST']      ?? '';
        $this->port       = (int) ($_ENV['MAIL_PORT'] ?? 587);
        $this->encryption = strtolower($_ENV['MAIL_ENCRYPTION'] ?? 'tls');
        $this->user       = $_ENV['MAIL_USER']      ?? '';
        $this->pass       = $_ENV['MAIL_PASS']      ?? '';
        $this->from       = $_ENV['MAIL_FROM']      ?? '';
        $this->fromName   = $_ENV['MAIL_FROM_NAME'] ?? 'Itemloop';
    }

    /**
     * Render a PHP email template and send it.
     *
     * @param string $to       Recipient email address
     * @param string $toName   Recipient display name
     * @param string $template Template filename without extension, e.g. 'password-reset'
     * @param array  $data     Variables injected into the template
     * @param string $locale   Language code ('en' or 'fr')
     */
    public function sendTemplate(
        string $to,
        string $toName,
        string $template,
        array $data = [],
        string $locale = 'en'
    ): void {
        $templateFile = __DIR__ . '/../Templates/emails/' . $template . '.php';
        if (!file_exists($templateFile)) {
            error_log("EmailService: template not found: $templateFile");
            return;
        }

        // Extract $data into local scope + $locale for template use
        extract($data);
        ob_start();
        require $templateFile;
        $html = ob_get_clean();

        // Subject lines per template and locale
        $subjects = [
            'en' => [
                'password-reset'           => 'Reset your password',
                'order-confirmation'        => 'Order confirmation',
                'order-status-update'       => 'Your order status has been updated',
                'order-notification-admin'  => 'New order received',
            ],
            'fr' => [
                'password-reset'           => 'Réinitialisez votre mot de passe',
                'order-confirmation'        => 'Confirmation de commande',
                'order-status-update'       => 'Votre commande a été mise à jour',
                'order-notification-admin'  => 'Nouvelle commande reçue',
            ],
        ];

        $lang    = isset($subjects[$locale]) ? $locale : 'en';
        $subject = $subjects[$lang][$template] ?? 'Itemloop notification';

        $this->send($to, $toName, $subject, $html, $template);
    }

    /**
     * Mask an email address for privacy: j***@example.com
     */
    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2) + ['', ''];
        return ($local[0] ?? '') . '***@' . $domain;
    }

    /**
     * Write a row to email_logs. Never throws.
     */
    private function log(string $to, string $template, string $subject, string $status, string $error = ''): void
    {
        try {
            $db   = \App\Database::get();
            $stmt = $db->prepare(
                'INSERT INTO email_logs (recipient, template, subject, status, error) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$this->maskEmail($to), $template ?: '', $subject, $status, $error ?: null]);
        } catch (\Throwable $e) {
            error_log('EmailService: failed to write log — ' . $e->getMessage());
        }
    }


    public function send(string $to, string $toName, string $subject, string $htmlBody, string $template = ''): void
    {
        if ($this->host === '') {
            // Email disabled — log for dev visibility
            error_log("EmailService: MAIL_HOST not configured, skipping email to $to (subject: $subject)");
            return;
        }

        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = $this->host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->user;
            $mail->Password   = $this->pass;
            $mail->SMTPSecure = $this->encryption === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = $this->port;
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom($this->from, $this->fromName);
            $mail->addAddress($to, $toName);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody));

            $mail->send();
            $this->log($to, $template, $subject, 'sent');
        } catch (MailerException $e) {
            error_log("EmailService: failed to send to $to — " . $e->getMessage());
            $this->log($to, $template, $subject, 'failed', $e->getMessage());
        }
    }
}
