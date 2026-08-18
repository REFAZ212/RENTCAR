<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use Barryvdh\DomPDF\PDF;

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
                'name' => Setting::get('nama_usaha', 'CVPILAR'),
                'alamat' => Setting::get('alamat_usaha', ''),
                'phone' => Setting::get('no_telp_usaha', ''),
            ],
        ];

        $pdf = PDF::loadView('invoices.order', $data);
        $pdf->setPaper('a4');

        return $pdf;
    }
}
