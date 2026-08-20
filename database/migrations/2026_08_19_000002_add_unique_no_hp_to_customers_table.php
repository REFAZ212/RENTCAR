<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Gabungkan customer duplikat (no_hp sama) ke record tertua sebelum
        // menambahkan constraint unique — order dipindahkan agar tidak hilang.
        $duplicates = DB::table('customers')
            ->select('no_hp')
            ->whereNotNull('no_hp')
            ->where('no_hp', '!=', '')
            ->groupBy('no_hp')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('no_hp');

        foreach ($duplicates as $noHp) {
            $ids = DB::table('customers')
                ->where('no_hp', $noHp)
                ->orderBy('id')
                ->pluck('id');

            $keepId = $ids->shift();

            DB::table('orders')
                ->whereIn('customer_id', $ids)
                ->update(['customer_id' => $keepId]);

            DB::table('customers')->whereIn('id', $ids)->delete();
        }

        Schema::table('customers', function (Blueprint $table) {
            $table->unique('no_hp');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['no_hp']);
        });
    }
};
