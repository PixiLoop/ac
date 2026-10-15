'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AdminShell } from '../../../components/layout/AdminShell'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { useToast } from '../../../components/ui/toast'

import { api } from '../../../lib/api-client'
import { useAuth } from '../../../providers/auth-provider'

import DataTable, { ColumnDef } from '../../../components/common/DataTable'
import RowActions from '../../../components/common/RowActions'
import { createPermissionChecker } from '../../../lib/permission'
import Link from 'next/link'

export type FMCustomerRow = {
  id: string
  fmWebNumber: string
  fleetName: string
  priceLevel: string
  priceFactor: number
  createdAt: string
  customerId: string
  customer?: {
    name: string
    customerNumber: string
  }
}

export default function FMCustomersListPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { permissions, isSystem } = useAuth()
  const { has } = createPermissionChecker(permissions, isSystem)

  const canCreate = has('fmcustomers.create')
  const canEdit = has('fmcustomers.edit')
  const canView = has('fmcustomers.view')
  const canDelete = has('fmcustomers.delete')

  const [rows, setRows] = useState<FMCustomerRow[]>([])
  const [rawRows, setRawRows] = useState<FMCustomerRow[]>([])
  const [loading, setLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({
    key: 'createdAt',
    dir: 'desc',
  })

  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [search, setSearch] = useState('')

  const [prePaidModalOpen, setPrePaidModalOpen] = useState(false)
  const [prePaidLoading, setPrePaidLoading] = useState(false)
  const [prePaidReports, setPrePaidReports] = useState<any[]>([])

  const [monthlyRunning, setMonthlyRunning] = useState(false)
  const [monthlyResultsOpen, setMonthlyResultsOpen] = useState(false)
  const [monthlyResults, setMonthlyResults] = useState<any[]>([])

  /* ================= LOAD DATA ================= */

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/fm-customers', {
        params: {
          search: search || undefined,
          skip: (page - 1) * pageSize,
          take: pageSize,
          sortKey: sort.key ?? undefined,
          sortDir: sort.dir ?? undefined,
          ...Object.fromEntries(
            Object.entries(filters)
              .filter(([, v]) => v?.length)
              .map(([k, v]) => [`filter_${k}`, v.join(',')])
          ),
        },
      })

      const payload = res.data?.data ?? res.data
      setRows(payload.items ?? [])
      setTotal(payload.total ?? 0)
    } catch {
      showToast({ type: 'error', title: 'Failed to load FM customers' })
    } finally {
      setLoading(false)
    }
  }

  // Load for filters only once

  const handleCheckPrePaid = async () => {
    setPrePaidModalOpen(true)
    setPrePaidLoading(true)
    try {
      const res = await api.get('/fm-subscription-reports/check-prepaid')
      setPrePaidReports(res.data?.data ?? res.data ?? [])
    } catch (err: any) {
      const raw = err?.response?.data?.message
      showToast({ type: 'error', title: typeof raw === 'string' ? raw : (raw?.message ?? 'Failed to check prepaid reports') })
    } finally {
      setPrePaidLoading(false)
    }
  }

  const handleInvoiceMonthly = async () => {
    if (!confirm('Run "Invoice Monthly" now? This will generate invoices for every eligible subscription report across all customers.')) return
    setMonthlyRunning(true)
    try {
      const res = await api.post('/fm-subscription-reports/generate-all-eligible')
      const results = res.data?.data ?? res.data ?? []
      setMonthlyResults(results)
      setMonthlyResultsOpen(true)
      const generated = results.filter((r: any) => r.invoiceNumber).length
      showToast({ type: 'success', title: `${generated} invoice(s) generated` })
    } catch (err: any) {
      const raw = err?.response?.data?.message
      showToast({ type: 'error', title: typeof raw === 'string' ? raw : (raw?.message ?? 'Invoice Monthly failed') })
    } finally {
      setMonthlyRunning(false)
    }
  }

  const loadForFilters = async () => {
    try {
      const res = await api.get('/fm-customers', { params: { skip: 0, take: 1000 } })
      const payload = res.data?.data ?? res.data
      setRawRows(payload.items ?? [])
    } catch {
      // silent fail   
    }
  }

  useEffect(() => {
    if (!canView) return
    load()
  }, [page, pageSize, sort, filters, search, canView])

  useEffect(() => {
    if (!canView) return
    loadForFilters()
  }, [])

  const uniq = (v: (string | undefined | null)[]) =>
    Array.from(new Set(v.filter(Boolean))).map(x => ({ label: x!, value: x! }))

  const columns: ColumnDef<FMCustomerRow>[] = [
    {
      key: 'fmWebNumber',
      title: 'FM Web No',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: uniq(rawRows.map(r => r.fmWebNumber)),
    },
    {
      key: 'customerNumber',
      title: 'Account No',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: uniq(rawRows.map(r => r.customer?.customerNumber)),
      render: r => r.customer ? <Link href={`/customers/${r.customerId}/view`}>{r.customer?.customerNumber}</Link> : '—',
    },
    {
      key: 'customerName',
      title: 'Customer',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: uniq(rawRows.map(r => r.customer?.name)),
      render: r => r.customer?.name ?? '—',
    },
    {
      key: 'fleetName',
      title: 'Fleet Name',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: uniq(rawRows.map(r => r.fleetName)),
    },
    {
      key: 'priceLevel',
      title: 'Price Level',
      sortable: true,
      filterable: true,
      filterType: 'multi',
      filterOptions: uniq(rawRows.map(r => r.priceLevel)),
    },
    {
      key: 'priceFactor',
      title: 'Factor',
      sortable: true,
      align: 'center',
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      render: r => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'center',
      width: 120,
      render: r => (
        <RowActions
          onView={canView ? () => router.push(`/admin/fm-customers/${r.id}/view`) : undefined}
          onEdit={canEdit ? () => router.push(`/admin/fm-customers/${r.id}`) : undefined}
          onDelete={
            canDelete
              ? async () => {
                if (!confirm('Delete this FM customer?')) return
                await api.delete(`/fm-customers/${r.id}`)
                showToast({ type: 'success', title: 'FM customer deleted' })
                load()
                loadForFilters()
              }
              : undefined
          }
        />
      ),
    },
  ]


  const handleFilterChange = (newFilters: Record<string, string[]>) => {
    setFilters(newFilters)
    setPage(1) // Reset to page 1 on filter change
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1) // Reset to page 1 on page size change
  }

  const handleSortChange = (newSort: { key: string | null; dir: 'asc' | 'desc' | null }) => {
    setSort(newSort)
    setPage(1) // Reset to page 1 on sort change
  }

  if (!canView) {
    return (
      <AdminShell title="FM Customers">
        <p className="text-sm text-slate-600">You do not have permission.</p>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="FM Customers" showTableDensity>
      <div className="space-y-4">
        <div className="flex justify-between">
          <Input
            placeholder="Search FM customers..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-[280px]"
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCheckPrePaid}>
              Check PrePaid
            </Button>
            <Button variant="outline" onClick={handleInvoiceMonthly} disabled={monthlyRunning}>
              {monthlyRunning ? 'Running…' : 'Invoice Monthly'}
            </Button>
            {canCreate && (
              <Button onClick={() => router.push('/admin/fm-customers/new')}>
                New FM Customer
              </Button>
            )}
          </div>
        </div>








        <DataTable
          loading={loading}
          data={rows}
          columns={columns}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          showRowsPerPage
          showPaginationArrows
        />
      </div>

      {/* CHECK PREPAID — review-only list of multi-month reports coming due
          for their advance-invoice window. No action buttons here by
          design — this is a planning view, matching the legacy screen. */}
      {prePaidModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm">Check PrePaid — Reports Due for Advance Invoicing</h3>
              <button className="text-slate-400 hover:text-slate-900" onClick={() => setPrePaidModalOpen(false)}>✕</button>
            </div>

            {prePaidLoading && <p className="text-sm text-slate-400">Loading…</p>}

            {!prePaidLoading && prePaidReports.length === 0 && (
              <p className="text-sm text-slate-400 italic">No multi-month reports are currently due for advance invoicing.</p>
            )}

            {!prePaidLoading && prePaidReports.length > 0 && (
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left text-xs">Customer</th>
                    <th className="px-2 py-1 text-left text-xs">Report</th>
                    <th className="px-2 py-1 text-left text-xs">Period</th>
                    <th className="px-2 py-1 text-left text-xs">Offset</th>
                    <th className="px-2 py-1 text-left text-xs">Last Invoiced Through</th>
                  </tr>
                </thead>
                <tbody>
                  {prePaidReports.map((r: any) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-2 py-1">{r.fmCustomer?.customer?.name ?? '—'}</td>
                      <td className="px-2 py-1">{r.name ?? r.reportType}</td>
                      <td className="px-2 py-1">{r.invoicePeriodMonths} mo</td>
                      <td className="px-2 py-1">{r.volumeOffsetMonths} mo</td>
                      <td className="px-2 py-1">
                        {r.lastInvoicedPeriodEnd ? new Date(r.lastInvoicedPeriodEnd).toLocaleDateString('en-AU') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setPrePaidModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE MONTHLY — results of the batch run just triggered */}
      {monthlyResultsOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm">Invoice Monthly — Run Results</h3>
              <button className="text-slate-400 hover:text-slate-900" onClick={() => setMonthlyResultsOpen(false)}>✕</button>
            </div>

            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left text-xs">Report ID</th>
                  <th className="px-2 py-1 text-left text-xs">Result</th>
                </tr>
              </thead>
              <tbody>
                {monthlyResults.map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1 font-mono text-xs">{r.reportId}</td>
                    <td className="px-2 py-1">
                      {r.invoiceNumber ? (
                        <span className="text-green-700">✓ Invoice {r.invoiceNumber}</span>
                      ) : (
                        <span className="text-slate-400">— {r.skipped}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setMonthlyResultsOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
