<?php

namespace App\Policies;

use App\Models\InspeksiKendaraan;
use App\Models\User;

class InspeksiKendaraanPolicy
{
    private const ROLES = ['admin_utama', 'admin_operasional', 'petugas'];

    public function viewAny(User $user): bool
    {
        return in_array($user->role, self::ROLES);
    }

    public function view(User $user, InspeksiKendaraan $inspeksi): bool
    {
        return in_array($user->role, self::ROLES);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, self::ROLES);
    }

    public function update(User $user, InspeksiKendaraan $inspeksi): bool
    {
        if ($user->role === 'petugas') {
            // Petugas hanya boleh mengubah inspeksi yang masih DRAFT miliknya.
            // Setelah dikirim (final), data terkunci — admin yang mengoreksi.
            return $inspeksi->status === 'draft' && $inspeksi->admin_id === $user->id;
        }

        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    /**
     * Perbaiki tanda tangan pada inspeksi final (mis. inspeksi return yang
     * kurang TTD sehingga order tidak bisa ditutup). Hanya admin.
     */
    public function perbaikiTtd(User $user, InspeksiKendaraan $inspeksi): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, InspeksiKendaraan $inspeksi): bool
    {
        if ($user->role === 'petugas') {
            // Petugas boleh menghapus/berhenti pada draft miliknya sendiri.
            return $inspeksi->status === 'draft' && $inspeksi->admin_id === $user->id;
        }

        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }
}
