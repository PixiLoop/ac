'use client'

import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Checkbox } from '../../../components/ui/checkbox'
import { api } from '../../../lib/api-client'
import { useToast } from '../../../components/ui/toast'
import DataTable from '../../common/DataTable'

type Report = {
  id: string
  name: string | null
  invoicePeriodMonths: number
  reportType: string
  reportTarget: string
  filterServiceCode: string | null
  filterOptionCode: string | null
  sortBy: string | null
  listBy: string | null
  volumeOffsetMonths: number
  isActive: boolean
  lastInvoicedPeriodEnd: string | null
  invoiceBy?: string | null
  listSpace?: number | null
  lVol?: number | null
  price?: number | null
  orderNumber?: string | null
  memo?: string | null
}

type Props = {
  fmCustomerId?: string
  readOnly?: boolean
}

export const REPORT_TYPES = [
  { label: 'Service', value: 'SERVICE' },
  { label: 'Service + Option', value: 'SERVICE_OPTION' },
  { label: 'Intern. SIM', value: 'INTERN_SIM' },
  { label: 'AI Option', value: 'AI_OPTION' },
  { label: 'TMA Option', value: 'TMA_OPTION' },
  { label: 'RIM Option', value: 'RIM_OPTION' },
  { label: 'NRC Option', value: 'NRC_OPTION' },
  { label: 'Safe Guard', value: 'SAFE_GUARD' },
]

export const REPORT_TARGETS = [
  { label: 'Invoice', value: 'Invoice' },
  { label: 'Excel', value: 'Excel' },
  { label: 'PDF', value: 'PDF' },
  { label: 'N/A', value: 'N_A' },
]

export const INVOICE_BY = [
  { label: 'All Units', value: "All_Units" },
  { label: 'Depot', value: 'Depot' },
  { label: 'FM Service', value: 'FM_Service' },
  { label: 'Option', value: 'Option' },
]

export function FMSubscriptionReportsSection({ fmCustomerId, readOnly }: Props) {
  const { showToast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [previewFor, setPreviewFor] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const initialReportState = {
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

  const load = () => {
    if (!fmCustomerId) return
    setLoading(true)
    api.get('/fm-subscription-reports', { params: { fmCustomerId } })
      .then(res => setReports(res.data?.data ?? res.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [fmCustomerId])

  const handleAdd = async () => {
    if (!fmCustomerId) return
    setSaving(true)
    try {
      await api.post('/fm-subscription-reports', {
        fmCustomerId,
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
      showToast({ type: 'success', title: 'Report added' })
      setShowAdd(false)
      setNewReport(initialReportState)
      load()
    } catch (err: any) {
      const raw = err?.response?.data?.message
      showToast({ type: 'error', title: typeof raw === 'string' ? raw : (raw?.message ?? 'Failed to add report') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subscription report?')) return
    try {
      await api.delete(`/fm-subscription-reports/${id}`)
      showToast({ type: 'success', title: 'Report deleted' })
      load()
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to delete report' })
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

  const handleGenerate = async (id: string) => {
    if (!confirm('Generate the subscription invoice now for this report?')) return
    try {
      const res = await api.post(`/fm-subscription-reports/${id}/generate`)
      const invoiceNumber = res.data?.data?.invoiceNumber ?? res.data?.invoiceNumber
      showToast({ type: 'success', title: `Invoice ${invoiceNumber} generated` })
      setPreviewFor(null)
      load()
    } catch (err: any) {
      const raw = err?.response?.data?.message
      showToast({ type: 'error', title: typeof raw === 'string' ? raw : (raw?.message ?? 'Generate failed') })
    }
  }

  if (!fmCustomerId) {
    return (
      <div className="rounded-md border bg-white p-4">
        <h3 className="text-sm font-semibold mb-2">Subscription Reports</h3>
        <p className="text-sm text-slate-400 italic">Save this FM Customer first to manage subscription reports.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-white p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Subscription Reports</h3>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowAdd(v => !v)}>
            {showAdd ? 'Cancel' : 'Add Report'}
          </Button>
        )}
      </div>

      {showAdd && (
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

            <Button size="sm" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving…' : 'Save Report'}
            </Button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {!loading && reports.length === 0 && (
        <p className="text-sm text-slate-400 italic">No subscription reports configured yet.</p>
      )}

      {!loading && reports.length > 0 && (
        <>
          <DataTable
            loading={loading}
            data={reports}
            total={reports.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            columns={[
              {
                key: 'subscriptionNumber',
                title: 'subscriptionNumber',
                sortable: true,
                filterable: true
              },
              {
                key: 'name',
                title: 'Name',
                sortable: true,
                filterable: true
              },
              {
                key: 'Type',
                title: 'Type',
                render: row => (REPORT_TYPES.find(t => t.value === row.reportType)?.label),
              },
              {
                key: 'Period',
                title: 'Period',
                sortable: true,
                filterable: true,
                filterType: 'multi',
                render: row => (<>{row.invoicePeriodMonths} mo</>),
              },
              {
                key: 'Offset',
                title: 'Offset',
                sortable: true,
                filterable: true,
                filterType: 'multi',
                render: row => <>{row.volumeOffsetMonths} mo</>,
              },
              {
                key: 'LastInvoicedThrough',
                title: 'Last Invoiced Through',
                sortable: true,
                filterable: true,
                filterType: 'multi',
                render: row => row.lastInvoicedPeriodEnd ? new Date(row.lastInvoicedPeriodEnd).toLocaleDateString('en-AU') : '—',
              },
              {
                key: 'Active',
                title: 'Active',
                sortable: true,
                filterable: true,
                filterType: 'multi',
                render: row => row.isActive ? '✅' : '—',
              },
              {
                key: 'Target',
                title: 'Target',
                sortable: true,
                filterable: true,
                filterType: 'multi',
                render: row => (
                  <span className={row.reportTarget === 'EXCEL' ? 'text-slate-500' : 'text-blue-600 font-medium'}>
                    {row.reportTarget === 'EXCEL' ? '📊 Excel' : '📄 Invoice'}
                  </span>
                )
              },
              {
                key: 'actions',
                title: 'Action',
                render: row => (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handlePreview(row.id)}>Preview</Button>
                    {!readOnly && row.reportTarget === 'INVOICE' && (
                      <>
                        <Button size="sm" className="ml-1" onClick={() => handleGenerate(row.id)}>Generate Now</Button>
                        <button
                          className="ml-2 text-slate-400 hover:text-red-500 text-xs"
                          onClick={() => handleDelete(row.id)}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </>
                ),
              },
            ]}
          />
          {/* <table className="w-full border text-sm">
            <thead>
              <tr className="h-8 bg-gray-50">
                <th className="px-2 py-1 text-left text-xs">Name</th>
                <th className="px-2 py-1 text-left text-xs">Type</th>
                <th className="px-2 py-1 text-left text-xs">Period</th>
                <th className="px-2 py-1 text-left text-xs">Offset</th>
                <th className="px-2 py-1 text-left text-xs">Last Invoiced Through</th>
                <th className="px-2 py-1 text-left text-xs">Active</th>
                <th className="px-2 py-1 text-left text-xs">Target</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1">{r.name || '—'}</td>
                  <td className="px-2 py-1">{REPORT_TYPES.find(t => t.value === r.reportType)?.label}</td>
                  <td className="px-2 py-1">{r.invoicePeriodMonths} mo</td>
                  <td className="px-2 py-1">{r.volumeOffsetMonths} mo</td>
                  <td className="px-2 py-1">
                    {r.lastInvoicedPeriodEnd ? new Date(r.lastInvoicedPeriodEnd).toLocaleDateString('en-AU') : '—'}
                  </td>
                  <td className="px-2 py-1">{r.isActive ? '✅' : '—'}</td>
                  <td className="px-2 py-1">
                    <span className={r.reportTarget === 'EXCEL' ? 'text-slate-500' : 'text-blue-600 font-medium'}>
                      {r.reportTarget === 'EXCEL' ? '📊 Excel' : '📄 Invoice'}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => handlePreview(r.id)}>Preview</Button>
                    {!readOnly && r.reportTarget === 'INVOICE' && (
                      <>
                        <Button size="sm" className="ml-1" onClick={() => handleGenerate(r.id)}>Generate Now</Button>
                        <button
                          className="ml-2 text-slate-400 hover:text-red-500 text-xs"
                          onClick={() => handleDelete(r.id)}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table> */}
        </>
      )}

      {/* PREVIEW PANEL */}
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
                  {!readOnly && (
                    <Button onClick={() => handleGenerate(previewFor)}>Generate Invoice</Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}