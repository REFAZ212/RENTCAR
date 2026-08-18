<?php

namespace App\Policies;

use App\Models\Kategori;
use App\Models\User;

class KategoriPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function view(User $user, Kategori $kategori): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function update(User $user, Kategori $kategori): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, Kategori $kategori): bool
    {
        return $user->role === 'admin_utama';
    }
}
