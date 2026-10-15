'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api-client';
import { AdminShell } from '../../../components/layout/AdminShell';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { getLastInvoicePeriod } from '../../../lib/utils';
import { Select } from '../../../components/ui/select';
import { INVOICE_BY, REPORT_TARGETS, REPORT_TYPES } from '../../../components/fm-customer/sections/FMSubscriptionReportsSection';
import { useToast } from '../../../components/ui/toast';

export default function ViewSalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast()

  const router = useRouter()
  const [loading, setLoading] = useState(true);
  const [orderNo, setOrderNo] = useState('');
  const [subscription, setSubscription] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [previewFor, setPreviewFor] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  const initialReportState = {
    id: "",
    fmCustomerId: "",
    name: '',
    reportType: 'SERVICE',
    invoicePeriodMonths: '1',
    reportTarget: 'Invoice',
    invoiceBy: 'All_Units',
    sortBy: 'NO_SORT',
    listBy: 'Not_Listed',
    volumeOffsetMonths: '0',
    listSpace: '10',
    listVol: '0',
    startDate: '',
    isActive: true,
    priceIncludesGst: false,
  }

  const [newReport, setNewReport] = useState(initialReportState)
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/fm-subscription-reports/${id}`);
        const data = res.data?.data ?? res.data;

        console.log(data, "dataaaaaaaaaaaaaaaaaaa");
        setNewReport({
          id: data.id,
          fmCustomerId: data.fmCustomerId,
          invoiceBy: data.invoiceBy,
          invoicePeriodMonths: data.invoicePeriodMonths,
          isActive: data.isActive,
          listBy: data.listBy,
          listSpace: data.listSpace,
          listVol: data.listVol,
          name: data.name,
          priceIncludesGst: data.priceIncludesGst,
          reportTarget: data.reportTarget,
          reportType: data.reportType,
          sortBy: data.sortBy,
          startDate: data.startDate,
          volumeOffsetMonths: data.volumeOffsetMonths
        })

        setOrderNo(data.subscriptionNumber ?? '');
        setSubscription(data)
        setLoading(false);

      } catch (err) {
        console.error(err);
        router.push('/web-reports');
      }
    }

    load();
  }, [id, router]);


  const handleAdd = async () => {
    setSaving(true)
    try {
      await api.patch(`/fm-subscription-reports/${newReport.id}`, {
        fmCustomerId: newReport.fmCustomerId,
        name: newReport.name || undefined,
        invoicePeriodMonths: Number(newReport.invoicePeriodMonths) || 1,
        reportType: newReport.reportType,
        reportTarget: newReport.reportTarget,
        invoiceBy: newReport.invoiceBy || undefined,
        sortBy: newReport.sortBy,
        listBy: newReport.listBy,
        volumeOffsetMonths: Number(newReport.volumeOffsetMonths) || 0,
        listSpace: Number(newReport.listSpace) || 0,
        listVol: Number(newReport.listVol) || 0,
        startDate: newReport.startDate || undefined,
        isActive: newReport.isActive,
        priceIncludesGst: newReport.priceIncludesGst,
      })
      showToast({ type: 'success', title: 'Report updated' })
      setShowAdd(false)
      setNewReport(initialReportState)

      router.push("/web-reports")
    } catch (err: any) {
      const raw = err?.response?.data?.message
      showToast({ type: 'error', title: typeof raw === 'string' ? raw : (raw?.message ?? 'Failed to update report') })
    } finally {
      setSaving(false)
    }
  }


  const handlePreview = async (id: string) => {
    setPreviewFor(id)
    setPreviewLoading(true)
    setPreviewData(null)
    try {
      const res = await api.get(`/fm-subscription-reports/${id}/preview`)
      setPreviewData(res.data?.data ?? res.data)
    } catch (err: any) {
      const raw = err?.response?.data?.message
      showToast({ type: 'error', title: typeof raw === 'string' ? raw : (raw?.message ?? 'Preview failed') })
      setPreviewFor(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  if (loading || !subscription) {
    return (
      <AdminShell title="Edit Web Report">
        <div className="p-6 text-sm text-slate-500">Loading…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={`Edit Web Report: ${orderNo}`}>
      <div className="flex justify-end mb-4 gap-2">
        <Button
          variant="outline"
          onClick={() => router.push('/web-reports')}>
          Back
        </Button>
        <Button onClick={handleAdd}>
          Update Report
        </Button>
      </div>

      <div className="space-y-0">
        <div className="rounded-md border bg-white p-4">

          <div className="border rounded-md p-3 mb-4 bg-gray-50 space-y-3">
            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-3">
              <Input label="Name (optional)" value={newReport.name}
                onChange={(e: any) => setNewReport(p => ({ ...p, name: e.target.value }))} />
              <Select label="Invoice By" value={newReport.invoiceBy}
                onChange={(v: string) => setNewReport(p => ({ ...p, invoiceBy: v }))}
                options={INVOICE_BY} />
              <Input label="Advance Offset (months)" type="number" min="0" value={newReport.volumeOffsetMonths}
                onChange={(e: any) => setNewReport(p => ({ ...p, volumeOffsetMonths: e.target.value }))} />
              <Input label="Invoice Period (months)" type="number" min="1" value={newReport.invoicePeriodMonths}
                onChange={(e: any) => setNewReport(p => ({ ...p, invoicePeriodMonths: e.target.value }))} />
              <Input label="List Space" type="number" value={newReport.listSpace}
                onChange={(e: any) => setNewReport(p => ({ ...p, listSpace: e.target.value }))} />
              <Input label="L/Vol" type="number" value={newReport.listVol}
                onChange={(e: any) => setNewReport(p => ({ ...p, listVol: e.target.value }))} />
              <Select label="Report Type" value={newReport.reportType}
                onChange={(v: string) => setNewReport(p => ({ ...p, reportType: v }))}
                options={REPORT_TYPES} />
              <Select label="Report Target" value={newReport.reportTarget}
                onChange={(v: string) => setNewReport(p => ({ ...p, reportTarget: v }))}
                options={REPORT_TARGETS} />
              <Select label="Sort By" value={newReport.sortBy}
                onChange={(v: string) => setNewReport(p => ({ ...p, sortBy: v }))}
                options={[
                  { label: 'No Sort', value: 'NO_SORT' },
                  { label: 'FM Service', value: 'FM_SERVICE' },
                  { label: 'Depot', value: 'DEPOT' },
                ]} />
              <Select label="List By" value={newReport.listBy}
                onChange={(v: string) => setNewReport(p => ({ ...p, listBy: v }))}
                options={[
                  { label: 'Not Listed', value: 'Not_Listed' },
                  { label: 'Rego Number', value: 'Rego_Number' },
                  { label: 'Fleet Number', value: 'Fleet_Number' }
                ]} />
              <Input label="Start Date (optional)" type="date" value={newReport.startDate}
                onChange={(e: any) => setNewReport(p => ({ ...p, startDate: e.target.value }))} />
              <div className="flex items-center gap-6 pt-4">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded"
                    checked={newReport.isActive}
                    onChange={e => setNewReport(p => ({ ...p, isActive: e.target.checked }))}
                  />
                  Report Active
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded"
                    checked={newReport.priceIncludesGst}
                    onChange={e => setNewReport(p => ({ ...p, priceIncludesGst: e.target.checked }))}
                  />
                  Price includes GST
                </label>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2">
              <Button size="sm" variant="outline" onClick={() => handlePreview(subscription.id)}>Preview</Button>

              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? 'Updating…' : 'Update Report'}
              </Button>
            </div>
          </div>


          {previewFor && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-sm">Invoice Preview (Draft — not saved)</h3>
                  <button className="text-slate-400 hover:text-slate-900" onClick={() => setPreviewFor(null)}>✕</button>
                </div>

                {previewLoading && <p className="text-sm text-slate-400">Loading…</p>}

                {previewData && !previewLoading && (
                  <>
                    <p className="text-xs text-slate-500 mb-2">
                      Period: {previewData.periodLabel ?? `${new Date(previewData.periodStart).toLocaleDateString('en-AU')} — ${new Date(previewData.periodEnd).toLocaleDateString('en-AU')}`}
                    </p>
                    <div className='max-h-[70vh] overflow-auto'>
                      <table className="w-full text-xs border mb-3">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 text-left">Item</th>
                            <th className="px-2 py-1 text-right">Qty</th>
                            <th className="px-2 py-1 text-right">Rate</th>
                            <th className="px-2 py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.lines?.length === 0 && (
                            <tr><td colSpan={4} className="text-center text-slate-400 py-3">No eligible active assets found</td></tr>
                          )}
                          {previewData.lines?.map((l: any, i: number) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1">{l.label}</td>
                              <td className="px-2 py-1 text-right">{l.qty}</td>
                              <td className="px-2 py-1 text-right">${Number(l.rate).toFixed(2)}</td>
                              <td className="px-2 py-1 text-right">${Number(l.total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-right font-semibold text-sm mb-3">
                      Subtotal: ${Number(previewData.subtotal ?? 0).toFixed(2)}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setPreviewFor(null)}>Close</Button>
                      {/* {!readOnly && (
                        <Button onClick={() => handleGenerate(previewFor)}>Generate Invoice</Button>
                      )} */}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
