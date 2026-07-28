<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use Barryvdh\DomPDF\PDF;

class InvoiceService
{
    public function generatePdf(Order $order): PDF
    {
        $order->load(['customer', 'kendaraan.kategori', 'kendaraan.garasiPartner', 'admin', 'supir', 'calo', 'pembayarans']);

        $data = [
            'order' => $order,
            'company' => [
                'name' => Setting::get('nama_usaha', 'CVPILAR'),
                'alamat' => Setting::get('alamat_usaha', ''),
                'phone' => Setting::get('telepon_usaha', ''),
            ],
        ];

        $pdf = PDF::loadView('invoices.order', $data);
        $pdf->setPaper('a4');

        return $pdf;
    }
}
