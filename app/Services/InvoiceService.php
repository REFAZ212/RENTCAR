<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use Barryvdh\DomPDF\PDF;
use Illuminate\Support\Facades\Storage;

class InvoiceService
{
    public function generatePdf(Order $order): PDF
    {
        $order->load([
            'customer',
            'kendaraan.kategori',
            'kendaraan.garasiPartner',
            'admin',
            'supir',
            'calo',
            'pembayarans',
            'inspeksis' => fn ($q) => $q->orderBy('jenis')->orderBy('created_at'),
        ]);

        $inspeksiPickup = $order->inspeksis->where('jenis', 'pickup')->first();
        $inspeksiReturn = $order->inspeksis->where('jenis', 'return')->first();

        $data = [
            'order' => $order,
            'inspeksiPickup' => $inspeksiPickup,
            'inspeksiReturn' => $inspeksiReturn,
            'company' => [
                'name' => Setting::get('nama_usaha', 'UDIN RENCTCAR'),
                'alamat' => Setting::get('alamat_usaha', ''),
                'phone' => Setting::get('no_telp_usaha', ''),
                'email' => Setting::get('email_usaha', ''),
                'logo' => $this->logoDataUri(),
            ],
        ];

        $pdf = PDF::loadView('invoices.order', $data);
        $pdf->setPaper('a4');

        return $pdf;
    }

    private function logoDataUri(): ?string
    {
        $logo = Setting::get('logo_usaha', '');

        if ($logo && Storage::disk('public')->exists($logo)) {
            $extension = pathinfo($logo, PATHINFO_EXTENSION);

            return 'data:image/'.($extension ?: 'jpeg').';base64,'.base64_encode(Storage::disk('public')->get($logo));
        }

        return null;
    }
}
