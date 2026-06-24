'use client';

import React, { useState, useCallback } from 'react';
import { UploadCloud, Loader2, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { parseSpreadsheetFile, type SpreadsheetRow } from '@/lib/importSpreadsheet';
import { downloadUtf8CsvFile } from '@/lib/demoSpreadsheetTemplates';
import { toast } from 'sonner';

export type SpreadsheetImportMeta = { comment?: string };

/** `current` = rows processed so far (0…total); use for % and bar while saving. */
export type SpreadsheetImportProgress = { current: number; total: number };

/** A single row that failed: `label` identifies the row, `reason` explains why. */
export type SpreadsheetImportError = { label: string; reason: string };

/**
 * Returned by `onImportRows` to render a results/log view after processing.
 * Return `void` instead to keep the old behavior (toast + immediate close).
 */
export type SpreadsheetImportResult = {
    total: number;
    successCount: number;
    errors: SpreadsheetImportError[];
    /** Optional noun for the summary, e.g. "updated" or "imported". Defaults to "processed". */
    verb?: string;
};

export interface SpreadsheetImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    columnHint: React.ReactNode;
    onImportRows: (
        rows: SpreadsheetRow[],
        meta?: SpreadsheetImportMeta,
        onProgress?: (p: SpreadsheetImportProgress) => void,
    ) => Promise<void | SpreadsheetImportResult>;
    /** Optional demo CSV (headers + sample row) users can download before filling their file. */
    demoCsvTemplate?: { fileName: string; csv: string };
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
    isOpen,
    onClose,
    title,
    columnHint,
    onImportRows,
    demoCsvTemplate,
}) => {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [parsingFile, setParsingFile] = useState(false);
    const [saveProgress, setSaveProgress] = useState<SpreadsheetImportProgress | null>(null);
    const [importComment, setImportComment] = useState('');
    const [result, setResult] = useState<SpreadsheetImportResult | null>(null);

    const reset = useCallback(() => {
        setFile(null);
        setDragActive(false);
        setImportComment('');
        setParsingFile(false);
        setSaveProgress(null);
        setResult(null);
    }, []);

    const handleClose = () => {
        if (!busy) {
            reset();
            onClose();
        }
    };

    const runImport = async (f: File) => {
        const commentSnapshot = importComment.trim();
        setBusy(true);
        setParsingFile(true);
        setSaveProgress(null);
        setResult(null);
        try {
            const rows = await parseSpreadsheetFile(f);
            setParsingFile(false);
            if (rows.length === 0) {
                toast.error('No data rows found. Use a header row and at least one data row.');
                return;
            }
            const res = await onImportRows(
                rows,
                commentSnapshot ? { comment: commentSnapshot } : undefined,
                (p) => setSaveProgress(p),
            );
            if (res && typeof res === 'object') {
                // Keep the modal open to show the results/log view.
                setResult(res);
                setFile(null);
            } else {
                reset();
                onClose();
            }
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : 'Could not read file');
        } finally {
            setBusy(false);
            setParsingFile(false);
            setSaveProgress(null);
        }
    };

    const onPick = (f: File | null | undefined) => {
        if (!f) return;
        const ok =
            f.name.toLowerCase().endsWith('.csv') ||
            f.name.toLowerCase().endsWith('.xlsx') ||
            f.name.toLowerCase().endsWith('.xls');
        if (!ok) {
            toast.error('Please choose a .csv, .xlsx, or .xls file');
            return;
        }
        setFile(f);
    };

    if (result) {
        const failedCount = result.errors.length;
        const verb = result.verb || 'processed';
        return (
            <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-lg">
                <div className="p-6 space-y-5">
                    <div className="flex items-start gap-3">
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                failedCount === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}
                        >
                            {failedCount === 0 ? (
                                <CheckCircle2 className="h-5 w-5" />
                            ) : (
                                <AlertTriangle className="h-5 w-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-semibold text-zinc-950">
                                {failedCount === 0 ? 'Import complete' : 'Import finished with some errors'}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-600">
                                <span className="font-semibold text-zinc-900">{result.successCount}</span> of{' '}
                                <span className="font-semibold text-zinc-900">{result.total}</span> rows {verb} successfully
                                {failedCount > 0 && (
                                    <>
                                        {' · '}
                                        <span className="font-semibold text-amber-700">{failedCount} failed</span>
                                    </>
                                )}
                                .
                            </p>
                        </div>
                    </div>

                    {failedCount > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                            <div className="border-b border-amber-200/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                                Skipped rows ({failedCount})
                            </div>
                            <ul className="max-h-56 divide-y divide-amber-100 overflow-y-auto custom-scrollbar text-xs">
                                {result.errors.map((err, idx) => (
                                    <li key={idx} className="flex items-start gap-2 px-4 py-2">
                                        <span className="shrink-0 font-semibold text-zinc-900">{err.label}</span>
                                        <span className="text-zinc-500">—</span>
                                        <span className="text-zinc-600">{err.reason}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-950 shadow-sm hover:border-orange-300 hover:bg-orange-50/80 transition-colors"
                        >
                            <RotateCcw className="h-3.5 w-3.5 text-orange-600" />
                            Import another file
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg bg-zinc-950 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-lg">
            <div className="p-6 space-y-5">
                <div className="text-sm text-zinc-600 space-y-2">
                    <p className="font-medium text-zinc-950">Supported formats</p>
                    <p>CSV (UTF-8) or Excel (.xlsx / .xls). The first row must be column headers.</p>
                    <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-xs text-zinc-700 leading-relaxed">
                        {columnHint}
                    </div>
                    {demoCsvTemplate && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between rounded-xl border border-orange-200/80 bg-orange-50/50 px-4 py-3">
                            <p className="text-xs text-zinc-700">
                                <span className="font-semibold text-zinc-950">New to this format?</span> Download a ready-made
                                CSV with headers and one example row.
                            </p>
                            <button
                                type="button"
                                onClick={() => downloadUtf8CsvFile(demoCsvTemplate.fileName, demoCsvTemplate.csv)}
                                className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-950 shadow-sm hover:border-orange-300 hover:bg-orange-50/80 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5 text-orange-600" />
                                Download template
                            </button>
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="spreadsheet-import-comment" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                        Import note <span className="font-normal text-zinc-400">(optional)</span>
                    </label>
                    <textarea
                        id="spreadsheet-import-comment"
                        value={importComment}
                        onChange={(e) => setImportComment(e.target.value.slice(0, 500))}
                        placeholder="e.g. batch name, source event, or context for your team…"
                        rows={2}
                        disabled={busy}
                        className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
                    />
                    <p className="mt-1 text-[11px] text-zinc-400">{importComment.length}/500 · Shown on your recent activity with this import</p>
                </div>

                <div
                    className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 transition-all ${
                        busy ? 'pointer-events-none cursor-not-allowed opacity-60' : 'cursor-pointer'
                    } ${
                        dragActive
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-zinc-300 bg-zinc-50 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                    onDragOver={(e) => {
                        if (busy) return;
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                        if (busy) return;
                        e.preventDefault();
                        setDragActive(false);
                        const f = e.dataTransfer.files[0];
                        onPick(f);
                    }}
                    onClick={() => {
                        if (!busy) document.getElementById('spreadsheet-import-input')?.click();
                    }}
                >
                    <UploadCloud
                        className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-orange-500' : 'text-zinc-400'}`}
                    />
                    <p className="text-zinc-950 font-bold text-sm mb-1">Drop file here or click to browse</p>
                    <p className="text-zinc-500 text-xs mb-4">.csv, .xlsx, .xls</p>
                    <label className="inline-flex items-center gap-2 bg-zinc-950 text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-zinc-800 transition-colors pointer-events-none">
                        <FileSpreadsheet className="w-4 h-4" />
                        Choose file
                    </label>
                    <input
                        id="spreadsheet-import-input"
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                        onChange={(e) => {
                            onPick(e.target.files?.[0]);
                            e.target.value = '';
                        }}
                    />
                </div>

                {file && (
                    <div className="flex items-center justify-between gap-3 text-sm text-zinc-700 bg-white border border-zinc-200 rounded-xl px-4 py-3">
                        <span className="truncate font-medium">{file.name}</span>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={(e) => {
                                e.stopPropagation();
                                void runImport(file);
                            }}
                            className="shrink-0 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold disabled:opacity-50"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                        </button>
                    </div>
                )}

                {busy && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-800">
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-orange-500" aria-hidden />
                                {parsingFile ? 'Reading spreadsheet…' : 'Importing rows…'}
                            </span>
                            {!parsingFile && saveProgress && saveProgress.total > 0 && (
                                <span className="tabular-nums text-orange-600">
                                    {Math.round((saveProgress.current / saveProgress.total) * 100)}%
                                </span>
                            )}
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                            {parsingFile ? (
                                <div className="h-full w-full rounded-full bg-orange-400/60 animate-pulse" />
                            ) : saveProgress && saveProgress.total > 0 ? (
                                <div
                                    className="h-full rounded-full bg-orange-500 transition-[width] duration-150 ease-out"
                                    style={{
                                        width: `${Math.min(100, Math.max(0, (saveProgress.current / saveProgress.total) * 100))}%`,
                                    }}
                                />
                            ) : (
                                <div className="h-full w-full rounded-full bg-orange-400/50 animate-pulse" />
                            )}
                        </div>
                        {!parsingFile && saveProgress && saveProgress.total > 0 && (
                            <p className="text-[11px] text-zinc-500">
                                {saveProgress.current} of {saveProgress.total} rows processed
                            </p>
                        )}
                    </div>
                )}

                <p className="text-[11px] text-zinc-500 text-center">
                    Column names are matched flexibly (spaces, case). Extra columns are ignored.
                </p>
            </div>
        </Modal>
    );
};
