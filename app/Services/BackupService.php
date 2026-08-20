<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

class BackupService
{
    /**
     * Kolom yang TIDAK ikut disalin pada dump manual (versi sanitasi untuk
     * diunduh admin): hash password & token gateway.
     */
    private const SENSITIVE_COLUMNS = [
        'users' => ['password'],
        'supir_calos' => ['password'],
        'settings' => ['fonnte_token'],
    ];

    /**
     * Buat backup database lengkap ke storage/app/backup/.
     * MySQL/MariaDB: pakai mysqldump (fallback ke dump manual bila binary
     * tidak tersedia). SQLite: dump manual.
     *
     * @return string Path absolut file backup.
     */
    public function createDump(): string
    {
        $path = $this->pathTujuan('backup');

        $driver = DB::getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'])) {
            try {
                $this->mysqldump($path);

                return $path;
            } catch (Throwable $e) {
                report($e);
            }
        }

        file_put_contents($path, $this->manualDump());

        return $path;
    }

    /**
     * Versi SANITASI untuk diunduh admin lewat browser: semua tabel tetap
     * ikut, tapi hash password & token gateway dikosongkan supaya tidak
     * bocor ke luar server. Disimpan di storage/app (bukan /backup) karena
     * sifatnya sekali pakai (deleteFileAfterSend).
     *
     * @return string Path absolut file backup.
     */
    public function createSanitizedDump(): string
    {
        $path = $this->pathTujuan('');

        file_put_contents($path, $this->manualDump());

        return $path;
    }

    /**
     * Hapus file backup yang lebih tua dari N hari (retensi otomatis).
     */
    public function cleanup(int $days): int
    {
        $dir = storage_path('app/backup');
        if (! is_dir($dir)) {
            return 0;
        }

        $cutoff = now()->subDays($days)->getTimestamp();
        $deleted = 0;

        foreach (glob($dir.'/backup-*.sql') ?: [] as $file) {
            if (filemtime($file) < $cutoff) {
                unlink($file);
                $deleted++;
            }
        }

        return $deleted;
    }

    /**
     * Dump semua tabel via mysqldump (proses eksternal). Password diteruskan
     * lewat env MYSQL_PWD supaya tidak terlihat di daftar proses.
     */
    private function mysqldump(string $path): void
    {
        $config = config('database.connections.mysql');

        $process = Process::timeout(600)
            ->env(['MYSQL_PWD' => (string) $config['password']])
            ->run([
                'mysqldump',
                '--no-tablespaces',
                '--single-transaction',
                '--quick',
                '--skip-lock-tables',
                '-h', (string) $config['host'],
                '-P', (string) $config['port'],
                '-u', (string) $config['username'],
                (string) $config['database'],
            ]);

        if (! $process->isSuccessful()) {
            throw new RuntimeException('mysqldump gagal: '.$process->getErrorOutput());
        }

        file_put_contents($path, $process->getOutput());
    }

    /**
     * Dump manual berbasis PHP: semua tabel + DDL + data, dengan sanitasi
     * kolom sensitif. Fallback bila mysqldump tidak tersedia.
     */
    private function manualDump(): string
    {
        $driver = DB::getDriverName();
        $tables = $this->semuaTabel();

        $dump = '-- Backup UDIN RENCTCAR '.now()->format('Y-m-d H:i:s')."\n"
            ."-- Driver: {$driver}\n"
            ."-- =============================\n\n";

        foreach ($tables as $table) {
            $ddl = $this->ddlTabel($driver, $table);
            if ($ddl !== null) {
                $dump .= "DROP TABLE IF EXISTS `{$table}`;\n";
                $dump .= $ddl.";\n\n";
            }

            $rows = DB::table($table)->get();
            if ($rows->isEmpty()) {
                continue;
            }

            $columns = array_keys((array) $rows->first());
            $columns = array_values(array_diff($columns, self::SENSITIVE_COLUMNS[$table] ?? []));
            if (empty($columns)) {
                continue;
            }
            $columnList = '`'.implode('`, `', $columns).'`';

            foreach ($rows as $row) {
                $rowData = (array) $row;
                $rowData = array_intersect_key($rowData, array_flip($columns));

                // Token gateway disimpan per-baris (kolom 'value'), bukan
                // per-kolom — kosongkan nilainya tanpa menghapus baris lain.
                if ($table === 'settings' && ($rowData['key'] ?? '') === 'fonnte_token') {
                    $rowData['value'] = '';
                }

                $values = array_map(
                    fn ($v) => $v === null ? 'NULL' : "'".addslashes((string) $v)."'",
                    $rowData
                );
                $dump .= "INSERT INTO `{$table}` ({$columnList}) VALUES (".implode(', ', $values).");\n";
            }
            $dump .= "\n";
        }

        return $dump;
    }

    private function semuaTabel(): array
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'])) {
            $rows = DB::select('SHOW TABLES');

            return array_values(array_map(
                fn ($row) => (string) array_values((array) $row)[0],
                $rows
            ));
        }

        if ($driver === 'sqlite') {
            $rows = DB::select(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            );

            return array_values(array_map(fn ($row) => $row->name, $rows));
        }

        return [];
    }

    private function ddlTabel(string $driver, string $table): ?string
    {
        if (in_array($driver, ['mysql', 'mariadb'])) {
            $create = DB::select("SHOW CREATE TABLE `{$table}`");

            return ! empty($create) ? $create[0]->{'Create Table'} : null;
        }

        if ($driver === 'sqlite') {
            $row = DB::selectOne(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
                [$table]
            );

            return $row?->sql;
        }

        return null;
    }

    private function pathTujuan(string $dir): string
    {
        $base = $dir !== '' ? rtrim($dir, '/').'/' : '';

        return storage_path('app/'.$base.'backup-udin-renctcar-'.now()->format('Y-m-d_His').'.sql');
    }
}
