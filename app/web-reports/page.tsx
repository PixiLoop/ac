'use client';

import { useEffect, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { AdminShell } from '../../components/layout/AdminShell';
import { api } from '../../lib/api-client';
import DataTable from '../../components/common/DataTable';
import { Select } from '../../components/ui/select';
import { REPORT_TYPES } from '../../components/fm-customer/sections/FMSubscriptionReportsSection';
import RowActions from '../../components/common/RowActions';
import { getLastInvoicePeriod } from '../../lib/utils';

export default function WebReportsPage() {
    const router = useRouter();
    const [webReports, setWebReports] = useState([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)

    const [filters, setFilters] = useState({
        reportType: "",
        fmCustomer: ""
    });

    const set = (k: string, v: any) =>
        setFilters((p: any) => ({ ...p, [k]: v }));

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get("/fm-subscription-reports", {
                    params: {
                        ...filters
                    }
                })
                const payload = res.data.data
                setWebReports(payload)
            } catch (error) {
            }
        }
        fetchData()
    }, [filters])

    const buildOptions = (values: (string | undefined | null)[]) =>
        Array.from(new Set(values.filter(Boolean)))
            .sort()
            .map(v => ({ label: v!, value: v! }));
    const orderNumberOptions = () =>
        buildOptions(webReports.map(r => r.subscriptionNumber));


    return (
        <AdminShell title="Web Reports">
            <div className="space-y-4">
                {/* 🔹 TOP FILTER BAR */}
                <div className="border p-3 rounded bg-gray-50 space-y-2">

                    <div className="grid grid-cols-8 gap-2 items-end">

                        <Select label="Report Type" value={filters.reportType}
                            onChange={e => set('reportType', e)}
                            options={REPORT_TYPES} />

                        <Input
                            label="FM Cus"
                            value={filters.fmCustomer || ''}
                            onChange={e => set('fmCustomer', e.target.value)}
                        />

                        {/* <Input label="Current Log Month" value="February-2026" readOnly />
                        <Input label="Last Run Month" value="January-2026" readOnly />
                        <Input label="Current Invoice Volume" value="February-2026" readOnly />

                        <Input label="Count" value="150" readOnly />
                        <Input label="Processed" value="" readOnly />

                        */}
                        <div className="flex gap-2">
                            <button className="border px-2 py-1 rounded">Reset</button>
                            {/* <button className="border px-2 py-1 rounded">Refresh</button> */}
                        </div>

                    </div>
                </div>

                <DataTable
                    loading={loading}
                    data={webReports}
                    total={10}
                    // total={total}
                    page={page}
                    pageSize={10}
                    onPageChange={setPage}
                    // onPageSizeChange={setPageSize}
                    // onSortChange={setSort}
                    // onFilterChange={setFilters}
                    columns={[
                        {
                            key: 'subscriptionNumber',
                            title: 'Subscription #',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            filterOptions: orderNumberOptions(),
                        },
                        {
                            key: 'name',
                            title: 'Subscription Name',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            filterOptions: buildOptions(webReports.map(report => report.name))
                        },
                        {
                            key: 'accountNumber',
                            title: 'Account Number',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            render: (row) => row.fmCustomer.customer.customerNumber,
                            filterOptions: buildOptions(webReports.map(report => report.fmCustomer.customer.customerNumber))
                        },
                        {
                            key: 'fmCustomer',
                            title: 'FM Customer',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            render: (row) => row.fmCustomer.fmWebNumber,
                            filterOptions: buildOptions(webReports.map(report => report.fmCustomer.fmWebNumber))
                        },
                        {
                            key: 'reportDate',
                            title: 'Report Date',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            render: (row) => new Date(row.createdAt).toLocaleDateString('en-GB'),
                            filterOptions: buildOptions(webReports.map(report => new Date(report.createdAt).toLocaleDateString('en-GB')))
                        },
                        {
                            key: 'fleetName',
                            title: 'Fleet Name',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            render: (row) => row.fmCustomer.fleetName,
                            filterOptions: buildOptions(webReports.map(report => report.fmCustomer.fleetName))
                        },
                        {
                            key: 'MIXService',
                            title: 'MIX Service',
                            render: () => null,
                        },
                        {
                            key: 'Depot',
                            title: 'Depot',
                            sortable: true,
                            render: (row) => row.fmCustomer.depots,
                        },
                        {
                            key: 'LastInvoice',
                            title: 'Last Invoice',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            render: (row) => row.invoices.length > 0 ? row.invoices[0].invoiceNumber : "-",
                            filterOptions: buildOptions(webReports.map(report => report.invoices.length > 0 ? report.invoices[0].invoiceNumber : "-"))
                        },
                        {
                            key: 'InvoiceDate',
                            title: 'Invoice Date',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            render: (row) => row.invoices.length > 0 ? new Date(row.invoices[0].issuedAt).toLocaleDateString('en-GB') : "-",
                            filterOptions: buildOptions(webReports.map(report => report.invoices.length > 0 ? new Date(report.invoices[0].issuedAt).toLocaleDateString('en-GB') : "-"))
                        },
                        {
                            key: 'LastFMWInvoicePeriod',
                            title: 'Last FMW Invoice Period',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            render: (row) => row.invoices.length > 0 ? getLastInvoicePeriod(new Date(row.lastInvoicedPeriodEnd)) : "-",
                            filterOptions: buildOptions(webReports.map(report => report.invoices.length > 0 ? getLastInvoicePeriod(new Date(report.lastInvoicedPeriodEnd)) : "-"))
                        },



                        {
                            key: 'NextFMWLogPeriod',
                            title: 'Next FMW Log Period',
                            render: (row) => "February-2026"
                        },
                        {
                            key: 'invPeriod',
                            title: 'Invoice Period',
                            sortable: true,
                            filterable: true,
                            filterType: 'multi',
                            filterOptions: buildOptions(webReports.map(report => report.invPeriod))
                        },
                        {
                            key: 'actions',
                            title: 'Actions',
                            render: row => (
                                <RowActions
                                    idDeletable={false}
                                    onView={() =>
                                        router.push(`/web-reports/${row.id}/view`)
                                    }
                                    onEdit={row.invoices.length > 0 ? undefined : () =>
                                        router.push(`/web-reports/${row.id}`)
                                    }
                                />
                            ),
                        },
                    ]}
                />
            </div>
            {/* 🔹 FOOTER */}
            {/* <div className="border p-2 flex flex-wrap items-center justify-between gap-2 bg-gray-50">

                <div className="flex gap-3 items-center">

                    <button className="border px-2 py-1 rounded">Invoice Monthly</button>

                    <Checkbox
                        label="Check PrePaid"
                        checked={filters.checkPrePaid || false}
                        onChange={(v) => set('checkPrePaid', v)}
                    />

                    <Checkbox
                        label="Include Inactive"
                        checked={filters.includeInactive || false}
                        onChange={(v) => set('includeInactive', v)}
                    />

                    <Checkbox
                        label="Exclude Excel"
                        checked={filters.excludeExcel || false}
                        onChange={(v) => set('excludeExcel', v)}
                    />

                    <div className="flex gap-2 items-center">
                        <span>List Option:</span>
                        <label><input type="radio" name="list" /> List All</label>
                        <label><input type="radio" name="list" defaultChecked /> Active</label>
                        <label><input type="radio" name="list" /> List Monthly</label>
                        <label><input type="radio" name="list" /> List PrePaid</label>
                    </div>

                </div>

                <div className="flex gap-2">
                    <button className="border px-3 py-1 rounded bg-blue-500 text-white">Add Report</button>
                    <button className="border px-3 py-1 rounded">Close</button>
                </div>

            </div> */}
        </AdminShell>
    );
}