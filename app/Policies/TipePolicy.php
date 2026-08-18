<?php

namespace App\Policies;

use App\Models\Tipe;
use App\Models\User;

class TipePolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function view(User $user, Tipe $tipe): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function update(User $user, Tipe $tipe): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, Tipe $tipe): bool
    {
        return $user->role === 'admin_utama';
    }
}
