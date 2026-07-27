<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Hapus record pembayaran yang salah dari seed sebelumnya.
        // Seed lama membuat record dp dengan jumlah = harga_total untuk
        // order partial — ini tidak benar karena partial berarti
        // jumlah yang dibayar LEBIH KECIL dari harga_total.
        //
        // Record pelunasan (status='pelunasan') dengan jumlah = harga_total
        // untuk order paid SUDAH BENAR — tidak dihapus.
        DB::table('pembayarans')
            ->where('status', 'dp')
            ->whereRaw('jumlah = (SELECT harga_total FROM orders WHERE orders.id = pembayarans.order_id)')
            ->update(['catatan' => 'Data seed lama yang salah — silakan perbarui dari UI']);
    }

    public function down(): void
    {
        DB::table('pembayarans')
            ->where('status', 'dp')
            ->where('catatan', 'Data seed lama yang salah — silakan perbarui dari UI')
            ->update(['catatan' => null]);
    }
};
