export function FMCustomerSummarySection() {
  const fields = [
    { label: 'Total On Hold', value: 0 },
    { label: 'Total Waiting', value: 0 },
    { label: 'Decommission', value: 0 },
    { label: 'Total Active', value: 0 },
    //{ label: 'Total Installs', value: 0 },
    { label: 'Total Records', value: 0 },
  ]

  return (
    <div className="rounded-md border bg-white p-4 h-full">
      <h3 className="mb-4 text-sm font-semibold">Summary</h3>

      <div className="space-y-3">
        {fields.map(f => (
          <div
            key={f.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-slate-600">{f.label}</span>
            <span className="font-medium">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
