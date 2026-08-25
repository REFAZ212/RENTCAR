<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function view(User $user, Order $order): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    /**
     * Unduh invoice PDF — khusus admin (data finansial).
     */
    public function invoice(User $user, Order $order): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function update(User $user, Order $order): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, Order $order): bool
    {
        return $user->role === 'admin_utama';
    }

    /**
     * Cek apakah order ini bisa diproses (kirim/kembali) oleh user.
     */
    public function ikutiTask(User $user, Order $order): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    /**
     * Klaim task inspeksi — semua role (petugas & admin).
     */
    public function claim(User $user, Order $order): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    /**
     * Lepas klaim — admin boleh semua, petugas hanya klaim miliknya.
     */
    public function release(User $user, Order $order): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional'])
            || ($user->role === 'petugas' && $order->isClaimant($user->id));
    }
}
