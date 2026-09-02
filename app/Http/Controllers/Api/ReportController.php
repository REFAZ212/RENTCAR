<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function ringkasan(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->ringkasan(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function pendapatan(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'group' => 'nullable|in:harian,bulanan,tahunan',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());
        $group = $request->group ?? 'bulanan';

        return response()->json([
            'data' => $service->pendapatan($group),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function kendaraan(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->kendaraan(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function customer(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->customer(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function order(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->order(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function bagiHasil(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->bagiHasil(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function komisiCalo(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->komisiCalo(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function rekapGarasi(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->rekapGarasi(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function growth(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->growthComparison(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function piutang(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->piutang(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function profitabilitas(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->profitabilitas(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function detailOrder(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status_order' => 'nullable|in:pending,confirmed,active,perlu_verifikasi,completed,cancelled',
            'source' => 'nullable|in:admin,katalog',
            'garasi_partner_id' => 'nullable|integer',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        $filters = [
            'status_order' => $request->status_order,
            'source' => $request->source,
            'garasi_partner_id' => $request->garasi_partner_id,
        ];

        $data = $service->detailOrder($filters, (int) ($request->per_page ?? 25), (int) ($request->page ?? 1));
        $data['ringkasan'] = $service->detailOrderSummary($filters);

        return response()->json([
            'data' => $data,
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    public function decision(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        return response()->json([
            'data' => $service->dashboardDecision(),
            'periode' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
        ]);
    }

    // ── Export ───────────────────────────────────────────────────────

    public function export(Request $request, string $tab, string $format): StreamedResponse
    {
        if (! in_array($format, ['csv', 'xlsx'], true)) {
            abort(422, 'Format export tidak dikenali. Gunakan csv atau xlsx.');
        }

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status_order' => 'nullable|in:pending,confirmed,active,perlu_verifikasi,completed,cancelled',
            'source' => 'nullable|in:admin,katalog',
            'garasi_partner_id' => 'nullable|integer',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        $filename = sprintf('laporan-%s-%s-%s', $tab, $start->toDateString(), $end->toDateString());

        if ($tab === 'detail-lengkap') {
            if ($format === 'csv') {
                return $this->exportDetailLengkapCsv($service, $request, $filename);
            }

            return $this->streamSpreadsheet($this->buildDetailLengkapSpreadsheet($service, $request), $filename, 'xlsx');
        }

        if ($tab === 'all') {
            $spreadsheet = $this->buildSemuaLaporanSpreadsheet($service, $request);
        } else {
            $sections = match ($tab) {
                'ringkasan' => $service->sectionsRingkasan(),
                'pendapatan' => $service->sectionsPendapatan(),
                'kendaraan' => $service->sectionsKendaraan(),
                'customer' => $service->sectionsCustomer(),
                'order' => $service->sectionsOrder(),
                'bagi-hasil' => $service->sectionsBagiHasil(),
                'komisi-calo' => $service->sectionsKomisiCalo(),
                'piutang' => $service->sectionsPiutang(),
                'profitabilitas' => $service->sectionsProfitabilitas(),
                'rekap-garasi' => $service->sectionsRekapGarasi(),
                'detail-order' => $service->sectionsDetailOrder($this->detailOrderFilters($request)),
                default => abort(422, 'Tab laporan tidak dikenali'),
            };
            $spreadsheet = $this->buildSpreadsheet($sections);
        }

        return $this->streamSpreadsheet($spreadsheet, $filename, $format);
    }

    private function detailOrderFilters(Request $request): array
    {
        return [
            'status_order' => $request->status_order,
            'source' => $request->source,
            'garasi_partner_id' => $request->garasi_partner_id,
        ];
    }

    // ── Spreadsheet Builders ─────────────────────────────────────────

    private function buildSpreadsheet(array $sections): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $this->writeSectionsToSheet($sheet, $sections);

        return $spreadsheet;
    }

    private function buildSemuaLaporanSpreadsheet(ReportService $service, Request $request): Spreadsheet
    {
        $filters = $this->detailOrderFilters($request);

        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        // Sheet 1 — Detail Order (berrumus laba/margin), data mentah.
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Detail Order');
        $this->writeDetailOrderSheet($sheet, $this->detailOrdersFlat($service, $request));

        // Sheet 2 — Keputusan (ringkasan pengambilan keputusan).
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Keputusan');
        $this->writeDecisionSheet($sheet, $service->dashboardDecision($filters));

        // Sheet analitik per relasi, ditaruh setelah pasangan detail+keputusan.
        $analitik = [
            'Ringkasan' => fn () => $service->sectionsRingkasan(),
            'Pendapatan' => fn () => $service->sectionsPendapatan(),
            'Kendaraan' => fn () => $service->sectionsKendaraan(),
            'Customer' => fn () => $service->sectionsCustomer(),
            'Order' => fn () => $service->sectionsOrder(),
            'Bagi Hasil' => fn () => $service->sectionsBagiHasil(),
            'Komisi Calo' => fn () => $service->sectionsKomisiCalo(),
            'Piutang' => fn () => $service->sectionsPiutang(),
            'Laba Rugi' => fn () => $service->sectionsProfitabilitas(),
        ];

        foreach ($analitik as $sheetName => $build) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle($sheetName);
            $this->writeSectionsToSheet($sheet, $build());
        }

        return $spreadsheet;
    }

    private function writeSectionsToSheet(Worksheet $sheet, array $sections): void
    {
        $rowIndex = 1;
        $lastColumn = 'A';

        foreach ($sections as $section) {
            if (! empty($section['title'])) {
                $sheet->setCellValue("A{$rowIndex}", $section['title']);
                $sheet->getStyle("A{$rowIndex}")->getFont()->setBold(true)->setSize(13);
                $rowIndex++;
            }

            $sheet->fromArray($section['headers'], null, "A{$rowIndex}");
            $headerColumnCount = count($section['headers']);
            $headerLastColumn = Coordinate::stringFromColumnIndex($headerColumnCount);
            $lastColumn = max($lastColumn, $headerLastColumn);

            $headerRange = "A{$rowIndex}:{$headerLastColumn}{$rowIndex}";
            $sheet->getStyle($headerRange)->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
            $sheet->getStyle($headerRange)->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setRGB('2563EB');
            $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $rowIndex++;

            if (empty($section['rows'])) {
                $sheet->setCellValue("A{$rowIndex}", 'Belum ada data');
                $rowIndex++;
            } else {
                foreach ($section['rows'] as $row) {
                    $sheet->fromArray($row, null, "A{$rowIndex}");
                    $rowIndex++;
                }
            }

            $rowIndex++;
        }

        $lastColumnIndex = Coordinate::columnIndexFromString($lastColumn);
        for ($ci = 1; $ci <= $lastColumnIndex; $ci++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($ci))->setAutoSize(true);
        }
    }

    /**
     * Membangun spreadsheet "Detail Lengkap" (ber-rumus):
     * - Sheet Tabel 1 : detail per order (margin & laba dihitung via rumus)
     * - Sheet Tabel 2 : ringkasan + per kategori + top kendaraan (total via SUM)
     */
    private function buildDetailLengkapSpreadsheet(ReportService $service, Request $request): Spreadsheet
    {
        $orders = $this->detailOrdersFlat($service, $request);
        $decision = $service->dashboardDecision($this->detailOrderFilters($request));

        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        // Sheet 1 — Tabel 1 (detail order per baris + rumus)
        $sheet1 = $spreadsheet->createSheet();
        $sheet1->setTitle('Detail Order');
        $this->writeDetailOrderSheet($sheet1, $orders);

        // Sheet 2 — Tabel 2 (pengambilan keputusan)
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Keputusan');
        $this->writeDecisionSheet($sheet2, $decision);

        return $spreadsheet;
    }

    /**
     * Ambil semua order (tanpa pagination) untuk export Tabel 1.
     */
    private function detailOrdersFlat(ReportService $service, Request $request): array
    {
        $data = $service->detailOrder($this->detailOrderFilters($request), 0);

        return $data['data'];
    }

    private function writeDetailOrderSheet(Worksheet $sheet, array $orders): void
    {
        $headers = [
            'No', 'ID/Kode Order', 'Tanggal Pesan', 'Customer', 'No HP', 'Kendaraan', 'Tipe', 'Kategori',
            'Tanggal Mulai', 'Tanggal Selesai', 'Durasi', 'Supir', 'Calo',
            'Harga Jual', 'Denda', 'Komisi', 'Harga Beli (Partner)', 'Laba', 'Margin (%)',
        ];

        $sheet->setCellValue('A1', 'TABEL 1 — DETAIL PER ORDER');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->fromArray($headers, null, 'A2');
        $this->styleHeaderRange($sheet, 'A2:S2');

        $startRow = 3;
        foreach ($orders as $i => $r) {
            $row = $startRow + $i;
            $sheet->setCellValueExplicit("A{$row}", $i + 1, DataType::TYPE_NUMERIC);
            $sheet->setCellValue("B{$row}", $r['kode_order'] ?? '');
            $sheet->setCellValue("C{$row}", $r['tanggal_order'] ?? '');
            $sheet->setCellValue("D{$row}", $r['nama_customer'] ?? '');
            $sheet->setCellValue("E{$row}", $r['no_hp'] ?? '');
            $sheet->setCellValue("F{$row}", $r['nama_kendaraan'] ?? '');
            $sheet->setCellValue("G{$row}", $r['tipe'] ?? '');
            $sheet->setCellValue("H{$row}", $r['kategori'] ?? '');
            $sheet->setCellValue("I{$row}", $r['tanggal_mulai'] ?? '');
            $sheet->setCellValue("J{$row}", $r['tanggal_selesai'] ?? '');
            $sheet->setCellValue("K{$row}", $r['durasi_hari'] ?? '');
            $sheet->setCellValue("L{$row}", $r['nama_supir'] ?? '');
            $sheet->setCellValue("M{$row}", $r['nama_calo'] ?? '');

            $sheet->setCellValue("N{$row}", $this->num($r['harga_total'] ?? 0));
            $sheet->setCellValue("O{$row}", $this->num($r['denda_overtime'] ?? 0));
            $sheet->setCellValue("P{$row}", $this->num($r['komisi_calo'] ?? 0));
            $sheet->setCellValue("Q{$row}", $this->num($r['beban_partner'] ?? 0));

            // Laba/Margin hanya bermakna bila ada biaya (partner) atau komisi yang
            // bisa dipotong dari harga jual. Tanpa keduanya, laba = harga penuh dan
            // margin selalu 100% — tampilan yang menyesatkan, jadi dikosongkan.
            if (($r['beban_partner'] ?? 0) > 0 || ($r['komisi_calo'] ?? 0) > 0) {
                // Rumus: Laba = Harga - Komisi - Beban ; Margin = Laba / Harga * 100
                $sheet->setCellValue("R{$row}", "=N{$row}-P{$row}-Q{$row}");
                $sheet->setCellValue("S{$row}", "=IF(N{$row}>0,R{$row}/N{$row}*100,\"\")");
            }
        }

        $totalRow = $startRow + count($orders);
        $lastDataRow = $totalRow - 1;

        $sheet->setCellValue("A{$totalRow}", 'TOTAL');
        $sheet->getStyle("A{$totalRow}:S{$totalRow}")->getFont()->setBold(true);

        if ($lastDataRow >= $startRow) {
            $sheet->setCellValue("N{$totalRow}", "=SUM(N{$startRow}:N{$lastDataRow})");
            $sheet->setCellValue("O{$totalRow}", "=SUM(O{$startRow}:O{$lastDataRow})");
            $sheet->setCellValue("P{$totalRow}", "=SUM(P{$startRow}:P{$lastDataRow})");
            $sheet->setCellValue("Q{$totalRow}", "=SUM(Q{$startRow}:Q{$lastDataRow})");
            $sheet->setCellValue("R{$totalRow}", "=SUM(R{$startRow}:R{$lastDataRow})");
            $sheet->setCellValue("S{$totalRow}", "=IF(N{$totalRow}>0,R{$totalRow}/N{$totalRow}*100,\"\")");
        } else {
            $sheet->setCellValue("N{$totalRow}", 0);
            $sheet->setCellValue("O{$totalRow}", 0);
            $sheet->setCellValue("P{$totalRow}", 0);
            $sheet->setCellValue("Q{$totalRow}", 0);
            $sheet->setCellValue("R{$totalRow}", 0);
            $sheet->setCellValue("S{$totalRow}", 0);
        }

        foreach (range('A', 'S') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        foreach (['N', 'O', 'P', 'Q', 'R', 'S'] as $col) {
            $sheet->getStyle("{$col}{$startRow}:{$col}{$totalRow}")
                ->getNumberFormat()->setFormatCode('#,##0');
        }
        $sheet->getStyle("S{$startRow}:S{$totalRow}")->getNumberFormat()->setFormatCode('0.0');
    }

    private function writeDecisionSheet(Worksheet $sheet, array $decision): void
    {
        $r = $decision['ringkasan'];

        // Ringkasan finansial
        $sheet->setCellValue('A1', 'TABEL 2 — DATA PENGAMBILAN KEPUTUSAN');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $rows = [
            ['Ringkasan Finansial'],
            ['Jumlah Order', $r['total_order']],
            ['Total Harga (Pendapatan)', $this->num($r['total_harga'])],
            ['Total Denda', $this->num($r['total_denda'])],
            ['Total Komisi Calo', $this->num($r['total_komisi'])],
            ['Total Beban Partner', $this->num($r['total_beban'])],
            ['Total Laba Bersih', $this->num($r['total_laba'])],
            ['Margin Rata-rata (%)', $r['margin_rata_rata']],
        ];
        $sheet->fromArray($rows, null, 'A3');

        $end = 3 + count($rows) - 1;
        $sheet->getStyle("A3:A{$end}")->getFont()->setBold(true);
        $sheet->getStyle("B3:B{$end}")->getNumberFormat()->setFormatCode('#,##0');

        // Per kategori
        $katStart = $end + 2;
        $sheet->setCellValue("A{$katStart}", 'Per Kategori Kendaraan');
        $sheet->getStyle("A{$katStart}")->getFont()->setBold(true);
        $sheet->fromArray(['Kategori', 'Order', 'Total Harga', 'Total Beban', 'Total Komisi', 'Total Laba'], null, 'A'.($katStart + 1));
        $this->styleHeaderRange($sheet, 'A'.($katStart + 1).':F'.($katStart + 1));

        $row = $katStart + 2;
        foreach ($decision['per_kategori'] as $k) {
            $sheet->setCellValue("A{$row}", $k['nama_kategori']);
            $sheet->setCellValue("B{$row}", $k['jumlah_order']);
            $sheet->setCellValue("C{$row}", $this->num($k['total_harga']));
            $sheet->setCellValue("D{$row}", $this->num($k['total_beban']));
            $sheet->setCellValue("E{$row}", $this->num($k['total_komisi']));
            $sheet->setCellValue("F{$row}", "=C{$row}-D{$row}-E{$row}");
            $row++;
        }
        $sheet->getColumnDimension('A')->setAutoSize(true);

        // Top kendaraan terlaris
        $row += 2;
        $sheet->setCellValue("A{$row}", 'Top 5 Kendaraan Terlaris');
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);
        $row++;
        $sheet->fromArray(['Kendaraan', 'Kategori', 'Jumlah Order', 'Total Harga', 'Total Laba'], null, "A{$row}");
        $this->styleHeaderRange($sheet, "A{$row}:E{$row}");
        $hdrRow = $row;
        $row++;
        foreach ($decision['top_kendaraan_terlaris'] as $v) {
            $sheet->setCellValue("A{$row}", $v['nama_kendaraan']);
            $sheet->setCellValue("B{$row}", $v['kategori']);
            $sheet->setCellValue("C{$row}", $v['jumlah_order']);
            $sheet->setCellValue("D{$row}", $this->num($v['total_harga']));
            $sheet->setCellValue("E{$row}", $this->num($v['total_laba']));
            $row++;
        }
        $lastTerlaris = $row - 1;

        // Top kendaraan menguntungkan
        $row += 2;
        $sheet->setCellValue("A{$row}", 'Top 5 Kendaraan Paling Menguntungkan');
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);
        $row++;
        $sheet->fromArray(['Kendaraan', 'Kategori', 'Jumlah Order', 'Total Harga', 'Total Laba'], null, "A{$row}");
        $this->styleHeaderRange($sheet, "A{$row}:E{$row}");
        $row++;
        foreach ($decision['top_kendaraan_menguntungkan'] as $v) {
            $sheet->setCellValue("A{$row}", $v['nama_kendaraan']);
            $sheet->setCellValue("B{$row}", $v['kategori']);
            $sheet->setCellValue("C{$row}", $v['jumlah_order']);
            $sheet->setCellValue("D{$row}", $this->num($v['total_harga']));
            $sheet->setCellValue("E{$row}", $this->num($v['total_laba']));
            $row++;
        }

        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        foreach (['C', 'D', 'E', 'F'] as $col) {
            $sheet->getStyle("{$col}3:{$col}{$row}")->getNumberFormat()->setFormatCode('#,##0');
        }
    }

    private function exportDetailLengkapCsv(ReportService $service, Request $request, string $filename): StreamedResponse
    {
        $orders = $this->detailOrdersFlat($service, $request);
        $decision = $service->dashboardDecision($this->detailOrderFilters($request));

        $headers = [
            'No', 'ID/Kode Order', 'Tanggal Pesan', 'Customer', 'No HP', 'Kendaraan', 'Tipe', 'Kategori',
            'Tanggal Mulai', 'Tanggal Selesai', 'Durasi', 'Supir', 'Calo',
            'Harga Jual', 'Denda', 'Komisi', 'Harga Beli (Partner)', 'Laba', 'Margin (%)',
        ];

        $lines = [];
        $lines[] = implode(',', $headers);

        $totalHarga = 0;
        $totalDenda = 0;
        $totalKomisi = 0;
        $totalBeban = 0;
        $totalLaba = 0;

        foreach ($orders as $i => $r) {
            $laba = $this->num($r['harga_total'] ?? 0) - $this->num($r['komisi_calo'] ?? 0) - $this->num($r['beban_partner'] ?? 0);
            $margin = $this->num($r['harga_total'] ?? 0) > 0 ? round(($laba / $this->num($r['harga_total'])) * 100, 1) : 0;

            $totalHarga += $this->num($r['harga_total'] ?? 0);
            $totalDenda += $this->num($r['denda_overtime'] ?? 0);
            $totalKomisi += $this->num($r['komisi_calo'] ?? 0);
            $totalBeban += $this->num($r['beban_partner'] ?? 0);
            $totalLaba += $laba;

            $lines[] = implode(',', [
                $i + 1,
                $this->csv($r['kode_order'] ?? ''),
                $this->csv($r['tanggal_order'] ?? ''),
                $this->csv($r['nama_customer'] ?? ''),
                $this->csv($r['no_hp'] ?? ''),
                $this->csv($r['nama_kendaraan'] ?? ''),
                $this->csv($r['tipe'] ?? ''),
                $this->csv($r['kategori'] ?? ''),
                $this->csv($r['tanggal_mulai'] ?? ''),
                $this->csv($r['tanggal_selesai'] ?? ''),
                $this->csv($r['durasi_hari'] ?? ''),
                $this->csv($r['nama_supir'] ?? ''),
                $this->csv($r['nama_calo'] ?? ''),
                $this->num($r['harga_total'] ?? 0),
                $this->num($r['denda_overtime'] ?? 0),
                $this->num($r['komisi_calo'] ?? 0),
                $this->num($r['beban_partner'] ?? 0),
                $laba,
                $margin,
            ]);
        }

        $avgMargin = $totalHarga > 0 ? round(($totalLaba / $totalHarga) * 100, 1) : 0;
        $lines[] = implode(',', ['TOTAL', '', '', '', '', '', '', '', '', '', '', '', '', $totalHarga, $totalDenda, $totalKomisi, $totalBeban, $totalLaba, $avgMargin]);

        $content = implode("\n", $lines)."\n";

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, "{$filename}.csv", [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
        ]);
    }

    private function styleHeaderRange(Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle($range)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('2563EB');
        $sheet->getStyle($range)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    }

    private function num(mixed $value): float
    {
        return round((float) $value, 2);
    }

    private function csv(mixed $value): string
    {
        $v = (string) $value;
        if (str_contains($v, ',') || str_contains($v, '"') || str_contains($v, "\n")) {
            return '"'.str_replace('"', '""', $v).'"';
        }

        return $v;
    }

    private function streamSpreadsheet(Spreadsheet $spreadsheet, string $filename, string $format): StreamedResponse
    {
        if ($format === 'csv') {
            $writer = new Csv($spreadsheet);
            $extension = 'csv';
            $contentType = 'text/csv';
        } else {
            $writer = new Xlsx($spreadsheet);
            $extension = 'xlsx';
            $contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, "{$filename}.{$extension}", [
            'Content-Type' => $contentType,
            'Content-Disposition' => "attachment; filename=\"{$filename}.{$extension}\"",
        ]);
    }
}
