<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $orders = DB::table('orders')
            ->where('status_pembayaran', '!=', 'unpaid')
            ->get();

        foreach ($orders as $order) {
            DB::table('pembayarans')->insert([
                'order_id' => $order->id,
                'jumlah' => $order->harga_total,
                'metode_pembayaran' => $order->metode_pembayaran ?? 'cash',
                'status' => $order->status_pembayaran === 'paid' ? 'pelunasan' : 'dp',
                'bukti_transfer' => $order->bukti_transfer,
                'catatan' => null,
                'created_at' => $order->updated_at,
                'updated_at' => $order->updated_at,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('pembayarans')->truncate();
    }
};
