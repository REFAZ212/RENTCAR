<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('kode_task', 30)->unique();
            $table->foreignId('order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('kendaraan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('judul')->nullable();
            $table->text('deskripsi')->nullable();

            // Pickup / asal
            $table->string('pickup_location')->nullable();
            $table->decimal('pickup_lat', 10, 7)->nullable();
            $table->decimal('pickup_lng', 10, 7)->nullable();

            // Tujuan / destination
            $table->string('destination_location')->nullable();
            $table->decimal('destination_lat', 10, 7)->nullable();
            $table->decimal('destination_lng', 10, 7)->nullable();

            // Lifecycle status
            $table->enum('status', [
                'pending', 'available', 'accepted', 'inspection_before',
                'on_delivery', 'arrived', 'inspection_after', 'completed', 'cancelled',
            ])->default('pending');

            // Assignment (first-come-first-served)
            $table->foreignId('assigned_driver_id')->nullable()->constrained('supir_calos')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable();

            // Inspections
            $table->foreignId('inspection_before_id')->nullable()->constrained('inspeksi_kendaraans')->nullOnDelete();
            $table->foreignId('inspection_after_id')->nullable()->constrained('inspeksi_kendaraans')->nullOnDelete();

            // Delivery tracking
            $table->timestamp('started_delivery_at')->nullable();
            $table->decimal('start_lat', 10, 7)->nullable();
            $table->decimal('start_lng', 10, 7)->nullable();
            $table->decimal('start_accuracy', 8, 2)->nullable();

            $table->timestamp('arrived_at')->nullable();
            $table->decimal('arrive_lat', 10, 7)->nullable();
            $table->decimal('arrive_lng', 10, 7)->nullable();
            $table->decimal('arrive_accuracy', 8, 2)->nullable();

            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['status', 'assigned_driver_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_tasks');
    }
};