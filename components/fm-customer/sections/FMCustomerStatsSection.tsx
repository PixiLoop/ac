export function FMCustomerStatsSection() {
  const stats = [
    'Total On Hold',
    'Total Waiting',
    'Decommission',
    'Total Active',
    'Total Installs',
    'First Record',
    'Last Record',
    'Total Records'
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(s => (
        <div key={s} className="flex justify-between bg-muted p-2 rounded">
          <span>{s}</span>
          <span>0</span>
        </div>
      ))}
    </div>
  )
}
