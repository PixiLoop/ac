'use client';

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card, CardHeader, CardTitle, CardContent, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./shared-ui";
import { api } from '../../lib/api-client';
import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';

// ── Types ────────────────────────────────────────────────────────────────────
interface ImportRow {
  rowNo: number;
  partNo: string;
  result: "Imported" | "Skipped Existing" | "Failed" | "Warning";
  message: string;
}

interface ImportResult {
  imported: number;
  skippedExisting: number;
  failed: number;
  warnings: number;
  rows: ImportRow[];
}

// ── Sample template columns (matches backend importExcel field mapping) ──────
const TEMPLATE_COLUMNS = [
  "Product ID", "Name", "Parent Product(Replacement Item)", "Product Category",
  "Status", "Replaced / Alternate",
  "Bill Of Goods", "Field Service Product Type", "Decimals Supported",
  "Default Unit", "Unit Group",
  "Vendor Name", "Vendor Number", "Vendor Web", "Vendor Part Number",
  "Reorder Logic", "Automatic Max Qty", "Automatic Min Qty",
  "Fixed Min Qty", "Fixed Max Qty",
  "FM Service Hardware (Check box for FM Attribute)", "Is Monitor",
  "FM Unit Type", "FM Unit Code", "4G Unit Modem", "Mix Unit Sim",
  "Fuel Rebate", "Intern SIM", "RIM Option", "NRC Option", "TMA Option",
  "Is Vision", "4G Vision Device", "Standard Vision", "High Definition",
  "AI Option", "Camera Count2", "MiX Vis SIM", "4G Vision Modem",
  "Net Supplier Buy Price", "Import Duty", "Import Markup", "Landed Cost",
  "Airco Fixed Markup Group",
  "Agent Price", "Sales Partner Price", "Trade Price", "Retail Price",
  "Sales Margin", "Selling Price", "GST %",
];

// Sample data row so template is not empty
const TEMPLATE_SAMPLE_ROW: Record<string, string | number> = {
  "Product ID": "SAMPLE-001",
  "Name": "Sample Product",
  "Product Category": "Hardware",
  "Status": "Active",
  "Default Unit": "EA",
  "Vendor Name": "Sample Vendor",
  "Retail Price": 99.99,
  "GST %": 10,
};

function downloadTemplate() {
  const a = document.createElement("a");
  a.href = "/Import Products Sample Sheet.xlsx";
  a.download = "Import Products Sample Sheet.xlsx";
  a.click();
}

// ── Component ────────────────────────────────────────────────────────────────
export function BulkImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ignoreExisting, setIgnoreExisting] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [validateSuppliers, setValidateSuppliers] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);
  const canImport = has('inventory.import');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    setResult(null);
    setError(null);
  }

  function clearFile() {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("ignoreExisting", String(ignoreExisting));
      formData.append("updateExisting", String(updateExisting));
      formData.append("validateSuppliers", String(validateSuppliers));

      const res = await api.post('/products/upload', formData);

      // axios: res.data is already parsed JSON
      const payload = res.data?.data ?? res.data;
      setResult({
        imported: payload.imported ?? 0,
        skippedExisting: payload.skippedExisting ?? 0,
        failed: payload.failed ?? 0,
        warnings: payload.warnings ?? 0,
        rows: payload.rows ?? [],
      });
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  const stats = result
    ? [
      { label: "Imported", value: result.imported, color: "text-emerald-600" },
      { label: "Skipped Existing", value: result.skippedExisting, color: "text-slate-700" },
      { label: "Failed", value: result.failed, color: "text-red-600" },
      { label: "Warnings", value: result.warnings, color: "text-amber-600" },
    ]
    : null;

  if (!canImport) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-slate-600">
        You do not have permission to import inventory.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Upload card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Item Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
            {/* Left — drop zone + controls */}
            <div className="rounded-xl border border-dashed p-6">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-slate-100 p-4">
                  <Upload className="h-6 w-6" />
                </div>

                {selectedFile ? (
                  <div className="flex w-full items-center justify-between rounded-lg border bg-slate-50 px-4 py-2 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="truncate font-medium">{selectedFile.name}</span>
                    </div>
                    <button onClick={clearFile} className="ml-2 shrink-0 text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-medium">Upload Excel / CSV</h3>
                    <p className="text-sm text-muted-foreground">
                      Support create-only, create-and-update, or ignore-existing modes.
                    </p>
                  </div>
                )}

                {/* Hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="grid w-full gap-3 md:grid-cols-2">
                  <Button variant="outline" onClick={downloadTemplate}>
                    Download Template
                  </Button>
                  {selectedFile ? (
                    <Button onClick={handleUpload} disabled={uploading}>
                      {uploading ? "Uploading…" : "Upload Now"}
                    </Button>
                  ) : (
                    <Button onClick={() => fileInputRef.current?.click()}>
                      Select File
                    </Button>
                  )}
                </div>

                <div className="w-full space-y-2 text-left text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ignoreExisting}
                      onChange={e => {
                        setIgnoreExisting(e.target.checked);
                        if (e.target.checked) setUpdateExisting(false);
                      }}
                      className="h-4 w-4"
                    />
                    Ignore existing part numbers
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={e => {
                        setUpdateExisting(e.target.checked);
                        if (e.target.checked) setIgnoreExisting(false);
                      }}
                      className="h-4 w-4"
                    />
                    Update existing items
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={validateSuppliers}
                      onChange={e => setValidateSuppliers(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Validate suppliers and groups before import
                  </label>
                </div>
              </div>
            </div>

            {/* Right — stats / placeholder */}
            {stats ? (
              <div className="grid gap-4 md:grid-cols-4">
                {stats.map(s => (
                  <Card key={s.label}>
                    <CardContent className="p-4">
                      <div className="mb-1 text-sm text-muted-foreground">{s.label}</div>
                      <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="md:col-span-4">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Process report shows imported rows, skipped rows, failed rows with error
                    descriptions, and warnings requiring review.
                  </CardContent>
                </Card>
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-slate-50 p-8 text-center text-sm text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 text-slate-300" />
                <p>Select a file and click <strong>Upload Now</strong> to see the import summary here.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Process Report ── */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Process Report</CardTitle>
          </CardHeader>
          <CardContent>
            {result.rows.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                All rows processed successfully. No detailed row-level report returned by server.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Part No</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map(row => (
                      <TableRow key={row.rowNo}>
                        <TableCell>{row.rowNo}</TableCell>
                        <TableCell className="font-medium">{row.partNo}</TableCell>
                        <TableCell>
                          {row.result === "Imported" && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Imported</Badge>}
                          {row.result === "Skipped Existing" && <Badge variant="secondary">Skipped Existing</Badge>}
                          {row.result === "Failed" && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>}
                          {row.result === "Warning" && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Warning</Badge>}
                        </TableCell>
                        <TableCell>{row.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}