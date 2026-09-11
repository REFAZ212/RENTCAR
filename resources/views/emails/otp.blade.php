<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kode Verifikasi Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6f8;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#111827,#1f2937,#1d4ed8);padding:24px 32px;">
                            <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">UDIN RENCTCAR</h1>
                            <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Verifikasi Email Akun</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:22px;">
                                Halo, kode verifikasi untuk akun <strong>{{ $email }}</strong> adalah:
                            </p>
                            <div style="margin:0 0 20px;padding:20px;text-align:center;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
                                <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1d4ed8;">{{ $otp }}</span>
                            </div>
                            <p style="margin:0 0 8px;color:#4b5563;font-size:14px;line-height:21px;">
                                Kode berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapa pun.
                            </p>
                            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:18px;">
                                Jika Anda tidak meminta verifikasi ini, abaikan email ini.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;color:#9ca3af;font-size:12px;">© {{ date('Y') }} UDIN RENCTCAR. Sistem Rental Kendaraan.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>