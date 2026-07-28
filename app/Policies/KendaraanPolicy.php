<?php

namespace App\Policies;

use App\Models\Kendaraan;
use App\Models\User;

class KendaraanPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function view(User $user, Kendaraan $kendaraan): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function update(User $user, Kendaraan $kendaraan): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, Kendaraan $kendaraan): bool
    {
        return $user->role === 'admin_utama';
    }
}
