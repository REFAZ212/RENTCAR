<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('garasi_partners', function (Blueprint $table) {
            $table->string('kota')->nullable()->after('alamat');
            $table->text('deskripsi_singkat')->nullable()->after('kota');
            $table->decimal('latitude', 10, 7)->nullable()->after('deskripsi_singkat');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->boolean('is_utama')->default(false)->after('longitude')->index();
        });

        // Pastikan cuma ada 1 garasi utama (jika sebelumnya ada data)
        $garasiUtama = DB::table('garasi_partners')->where('is_utama', true)->orderBy('id')->first();
        if (! $garasiUtama) {
            $first = DB::table('garasi_partners')->orderBy('id')->first();
            if ($first) {
                DB::table('garasi_partners')->where('id', $first->id)->update(['is_utama' => true]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('garasi_partners', function (Blueprint $table) {
            $table->dropColumn(['kota', 'deskripsi_singkat', 'latitude', 'longitude', 'is_utama']);
        });
    }
};
