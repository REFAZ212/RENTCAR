<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->decimal('biaya_kerusakan', 12, 2)->nullable()->after('catatan')
                ->comment('Estimasi biaya kerusakan (diisi operator saat return, final oleh admin)');
            $table->string('ttd_customer')->nullable()->after('foto')
                ->comment('Path foto tanda tangan digital pelanggan');
            $table->string('ttd_petugas')->nullable()->after('ttd_customer')
                ->comment('Path foto tanda tangan digital petugas');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('status_pengiriman');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->enum('status_pengiriman', ['belum_diambil', 'sudah_diantarkan', 'dalam_penyewaan', 'sudah_dikembalikan', 'selesai'])
                ->default('belum_diambil')
                ->after('status_pembayaran');
            $table->foreignId('operator_id')->nullable()->after('admin_id')
                ->constrained('users')->nullOnDelete()
                ->comment('Petugas/operator yang memegang task order ini');
            $table->decimal('biaya_kerusakan', 12, 2)->nullable()->after('denda_overtime')
                ->comment('Biaya kerusakan FINAL (ditentukan admin saat menutup order)');
        });
    }

    public function down(): void
    {
        Schema::table('inspeksi_kendaraans', function (Blueprint $table) {
            $table->dropColumn(['biaya_kerusakan', 'ttd_customer', 'ttd_petugas']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('operator_id');
            $table->dropColumn('biaya_kerusakan');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('status_pengiriman');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->enum('status_pengiriman', ['belum_diambil', 'sudah_diantarkan', 'dalam_penyewaan', 'selesai'])
                ->default('belum_diambil')
                ->after('status_pembayaran');
        });
    }
};
