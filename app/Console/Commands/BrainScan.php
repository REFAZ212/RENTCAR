<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

#[Signature('brain:scan {--dirs= : Folder yang dipindai, dipisahkan koma. Default: app/Models,app/Http/Controllers/Api,app/Services} {--detail : Tampilkan detail per-file dan deteksi method panjang}')]
#[Description('Scan codebase (Models, Controllers, Services) dan laporkan ringkasan serta anomali')]
class BrainScan extends Command
{
    private const LARGE_FILE_LINES = 400;

    private const LONG_METHOD_LINES = 200;

    private const DEFAULT_DIRS = [
        'app/Models',
        'app/Http/Controllers/Api',
        'app/Services',
    ];

    public function handle(): int
    {
        $dirs = $this->resolveDirs();

        if ($dirs === []) {
            return self::FAILURE;
        }

        $this->info('Memindai codebase...');
        $this->newLine();

        $summary = [];
        $verboseRows = [];
        $anomalies = [];
        $totalFiles = 0;
        $totalLines = 0;

        foreach ($dirs as $dir) {
            $files = $this->phpFiles($dir);
            $fileCount = count($files);
            $dirLines = 0;

            foreach ($files as $file) {
                $source = file_get_contents($file->getPathname());

                if ($source === false) {
                    $anomalies[] = [$this->relative($file->getPathname()), 'Tidak dapat dibaca', 'Gagal membaca file'];

                    continue;
                }

                $lines = substr_count($source, "\n") + 1;
                $dirLines += $lines;
                $totalLines += $lines;

                $info = $this->analyze($source);

                if ($this->option('detail')) {
                    $verboseRows[] = [
                        $this->relative($file->getPathname()),
                        $info['class'] !== null
                            ? ($info['namespace'] ? $info['namespace'].'\\'.$info['class'] : $info['class'])
                            : '-',
                        $lines,
                        (string) $info['publicMethods'],
                    ];
                }

                $this->collectAnomalies($file, $source, $info, $lines, $anomalies);
            }

            $totalFiles += $fileCount;
            $summary[] = [$this->relative($dir), $fileCount, $dirLines];
        }

        $summary[] = ['<info>TOTAL</info>', $totalFiles, $totalLines];

        $this->table(['Direktori', 'File', 'Baris'], $summary);

        if ($this->option('detail')) {
            $this->newLine();
            $this->info('Detail per-file:');
            $this->table(['File', 'Kelas', 'Baris', 'Public Method'], $verboseRows);
        }

        $this->printAnomalies($anomalies);

        $this->newLine();
        $this->info("Scan selesai: {$totalFiles} file, {$totalLines} baris.");

        return self::SUCCESS;
    }

    private function resolveDirs(): array
    {
        $raw = (string) $this->option('dirs');
        $parts = $raw !== '' ? explode(',', $raw) : self::DEFAULT_DIRS;

        $dirs = [];
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '') {
                continue;
            }

            $path = realpath($this->isAbsolutePath($part) ? $part : base_path($part));
            if ($path === false) {
                $this->error("Folder tidak ditemukan: {$part}");

                continue;
            }

            $dirs[] = $path;
        }

        if ($dirs === []) {
            $this->error('Tidak ada folder valid untuk dipindai.');
        }

        return $dirs;
    }

    private function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, DIRECTORY_SEPARATOR)
            || preg_match('/^[A-Za-z]:[\\\\\\/]/', $path) === 1;
    }

    private function phpFiles(string $dir): array
    {
        $files = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && strtolower($file->getExtension()) === 'php') {
                $files[] = $file;
            }
        }

        usort($files, fn (SplFileInfo $a, SplFileInfo $b) => strcmp($a->getPathname(), $b->getPathname()));

        return $files;
    }

    private function relative(string $path): string
    {
        return str_replace('\\', '/', str_replace(base_path().DIRECTORY_SEPARATOR, '', $path));
    }

    private function analyze(string $source): array
    {
        $tokens = token_get_all($source);
        $count = count($tokens);
        $namespace = null;
        $className = null;
        $publicMethods = 0;
        $functions = [];
        $line = 1;

        for ($i = 0; $i < $count; $i++) {
            $token = $tokens[$i];
            if (! is_array($token)) {
                continue;
            }

            $tokenLine = $line;

            if ($token[0] === T_NAMESPACE) {
                $namespace = $this->namespaceName($tokens, $i);
            } elseif ($token[0] === T_CLASS) {
                $next = $this->nextMeaningfulIndex($tokens, $i);
                if ($next !== null && is_array($tokens[$next]) && $tokens[$next][0] === T_STRING) {
                    $className = $tokens[$next][1];
                }
            } elseif ($token[0] === T_FUNCTION) {
                $this->countPublicFunction($tokens, $i, $publicMethods);

                $next = $this->nextMeaningfulIndex($tokens, $i);
                $name = ($next !== null && is_array($tokens[$next]) && $tokens[$next][0] === T_STRING)
                    ? $tokens[$next][1]
                    : '(closure)';
                $functions[] = ['name' => $name, 'line' => $tokenLine, 'index' => $i];
            }

            $line += substr_count($token[1], "\n");
        }

        foreach ($functions as $index => $function) {
            $functions[$index]['lines'] = $this->functionBodyLines($tokens, $function['index'], $function['line']);
        }

        return [
            'namespace' => $namespace,
            'class' => $className,
            'publicMethods' => $publicMethods,
            'functions' => $functions,
        ];
    }

    private function namespaceName(array $tokens, int $namespaceIndex): ?string
    {
        $name = '';
        $count = count($tokens);

        for ($i = $namespaceIndex + 1; $i < $count; $i++) {
            $token = $tokens[$i];
            if (is_array($token) && $token[0] === T_WHITESPACE) {
                continue;
            }
            if (is_array($token) && ($token[0] === T_STRING || $token[0] === T_NS_SEPARATOR)) {
                $name .= $token[1];

                continue;
            }
            break;
        }

        return $name !== '' ? $name : null;
    }

    private function countPublicFunction(array $tokens, int $functionIndex, int &$publicMethods): void
    {
        $prev = $this->prevMeaningfulIndex($tokens, $functionIndex);
        if ($prev === null || ! is_array($tokens[$prev])) {
            return;
        }

        $isPublic = $tokens[$prev][0] === T_PUBLIC;
        if (! $isPublic && $tokens[$prev][0] === T_STATIC) {
            $beforeStatic = $this->prevMeaningfulIndex($tokens, $prev);
            $isPublic = $beforeStatic !== null && is_array($tokens[$beforeStatic]) && $tokens[$beforeStatic][0] === T_PUBLIC;
        }

        if ($isPublic) {
            $publicMethods++;
        }
    }

    private function functionBodyLines(array $tokens, int $functionIndex, int $functionLine): int
    {
        $count = count($tokens);
        $depth = 0;
        $line = $functionLine;
        $bodyStart = null;

        for ($i = $functionIndex + 1; $i < $count; $i++) {
            $token = $tokens[$i];
            if (is_array($token)) {
                $line += substr_count($token[1], "\n");

                continue;
            }

            if ($token === '{') {
                $depth++;
                if ($bodyStart === null) {
                    $bodyStart = $line;
                }
            } elseif ($token === '}' && --$depth === 0 && $bodyStart !== null) {
                return max(1, $line - $bodyStart + 1);
            }
        }

        return 0;
    }

    private function prevMeaningfulIndex(array $tokens, int $index): ?int
    {
        for ($i = $index - 1; $i >= 0; $i--) {
            $token = $tokens[$i];
            if (! is_array($token)) {
                return $i;
            }
            if ($token[0] !== T_WHITESPACE && $token[0] !== T_COMMENT && $token[0] !== T_DOC_COMMENT) {
                return $i;
            }
        }

        return null;
    }

    private function nextMeaningfulIndex(array $tokens, int $index): ?int
    {
        $count = count($tokens);
        for ($i = $index + 1; $i < $count; $i++) {
            $token = $tokens[$i];
            if (! is_array($token)) {
                return $i;
            }
            if ($token[0] !== T_WHITESPACE && $token[0] !== T_COMMENT && $token[0] !== T_DOC_COMMENT) {
                return $i;
            }
        }

        return null;
    }

    private function collectAnomalies(SplFileInfo $file, string $source, array $info, int $lines, array &$anomalies): void
    {
        $relative = $this->relative($file->getPathname());
        $isModel = $info['namespace'] === 'App\\Models';

        if ($isModel) {
            if (! preg_match('/\$fillable\s*=/', $source)) {
                $anomalies[] = [$relative, 'Model tanpa $fillable', 'Deklarasikan $fillable atau $guarded agar mass-assignment aman'];
            }
            if (! preg_match('/\$table\s*=/', $source)) {
                $anomalies[] = [$relative, 'Tabel tidak eksplisit', 'Laravel meng-infer nama tabel dari kelas; deklarasikan $table bila tidak standar'];
            }
        }

        if (preg_match('/\b(TODO|FIXME|HACK)\b/i', $source, $match)) {
            $keyword = strtoupper($match[0]);
            $anomalies[] = [$relative, "Komentar {$keyword}", "Terdapat komentar {$keyword} pada file"];
        }

        if (preg_match('/\b(dd|dump|var_dump|print_r)\s*\(/', $source)) {
            $anomalies[] = [$relative, 'Debug statement', 'dd()/dump()/var_dump()/print_r() tertinggal di kode'];
        }

        if ($lines > self::LARGE_FILE_LINES) {
            $anomalies[] = [$relative, "File besar ({$lines} baris)", 'Pertimbangkan memecah file menjadi bagian lebih kecil'];
        }

        if ($this->option('detail')) {
            foreach ($info['functions'] as $function) {
                if ($function['lines'] > self::LONG_METHOD_LINES) {
                    $anomalies[] = [
                        $relative,
                        "Method panjang ({$function['lines']} baris)",
                        "{$function['name']}() mulai baris {$function['line']}",
                    ];
                }
            }
        }
    }

    private function printAnomalies(array $anomalies): void
    {
        $this->newLine();
        $this->info('Anomali:');

        if ($anomalies === []) {
            $this->line('Tidak ada anomali ditemukan.');

            return;
        }

        $this->table(['File', 'Masalah', 'Detail'], $anomalies);
    }
}
