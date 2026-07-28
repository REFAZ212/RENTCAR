<?php

namespace App\Policies;

use App\Models\InspeksiKendaraan;
use App\Models\User;

class InspeksiKendaraanPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function view(User $user, InspeksiKendaraan $inspeksi): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function update(User $user, InspeksiKendaraan $inspeksi): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, InspeksiKendaraan $inspeksi): bool
    {
        return $user->role === 'admin_utama';
    }
}
