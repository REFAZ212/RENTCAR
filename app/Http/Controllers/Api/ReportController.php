<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
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

    // ── Export ───────────────────────────────────────────────────────

    public function export(Request $request, string $tab, string $format): StreamedResponse
    {
        if (! in_array($format, ['csv', 'xlsx'], true)) {
            abort(422, 'Format export tidak dikenali. Gunakan csv atau xlsx.');
        }

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        [$start, $end] = ReportService::parseDates($request->only('start_date', 'end_date'));
        $service = new ReportService($start->toDateString(), $end->toDateString());

        $filename = sprintf('laporan-%s-%s-%s', $tab, $start->toDateString(), $end->toDateString());

        if ($tab === 'all') {
            $sheets = [
                'Ringkasan' => $service->sectionsRingkasan(),
                'Pendapatan' => $service->sectionsPendapatan(),
                'Kendaraan' => $service->sectionsKendaraan(),
                'Customer' => $service->sectionsCustomer(),
                'Order' => $service->sectionsOrder(),
                'Bagi Hasil' => $service->sectionsBagiHasil(),
                'Komisi Calo' => $service->sectionsKomisiCalo(),
            ];
            $spreadsheet = $this->buildMultiSheetSpreadsheet($sheets);
        } else {
            $sections = match ($tab) {
                'ringkasan' => $service->sectionsRingkasan(),
                'pendapatan' => $service->sectionsPendapatan(),
                'kendaraan' => $service->sectionsKendaraan(),
                'customer' => $service->sectionsCustomer(),
                'order' => $service->sectionsOrder(),
                'bagi-hasil' => $service->sectionsBagiHasil(),
                'komisi-calo' => $service->sectionsKomisiCalo(),
                default => abort(422, 'Tab laporan tidak dikenali'),
            };
            $spreadsheet = $this->buildSpreadsheet($sections);
        }

        return $this->streamSpreadsheet($spreadsheet, $filename, $format);
    }

    // ── Spreadsheet Builders ─────────────────────────────────────────

    private function buildSpreadsheet(array $sections): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $this->writeSectionsToSheet($sheet, $sections);

        return $spreadsheet;
    }

    private function buildMultiSheetSpreadsheet(array $sheets): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        foreach ($sheets as $sheetName => $sections) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle(mb_substr($sheetName, 0, 31));
            $this->writeSectionsToSheet($sheet, $sections);
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

        foreach (range('A', $lastColumn) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
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
