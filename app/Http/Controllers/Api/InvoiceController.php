<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InvoiceService;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function download(Request $request, Order $order, InvoiceService $invoice)
    {
        $this->authorize('view', $order);

        $pdf = $invoice->generatePdf($order);

        return $pdf->download("invoice-{$order->kode_order}.pdf");
    }
}
