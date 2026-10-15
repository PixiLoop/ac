'use client'

import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Checkbox } from '../../../components/ui/checkbox'
import { Input } from '../../../components/ui/input'
import { api } from '../../../lib/api-client'

type ApiService = {
  id: string
  productCode: string
  defaultPrice: number
}

type ServiceRow = {
  productId: string
  productCode: string
  numItems: number
  price: number
  category: string
  active?: number
  monthlyCharge?: number
}

type Option = {
  id: string
  label: string
  enabled: boolean
  charge: number
  vehicleCount: number
}

type Props = {
  priceLevel: string
  value: ServiceRow[]
  onChange: (rows: ServiceRow[]) => void

  options: Option[]
  onOptionsChange: (opts: Option[]) => void

  customerId?: string
  readOnly?: boolean
}

export function FMCustomerServicesSection({
  priceLevel,
  value = [],
  onChange,
  options,
  onOptionsChange,
  customerId,
  readOnly,
}: Props) {

  const MAX_ROWS = 4
  const [expanded, setExpanded] = useState(false)
  const [services, setServices] = useState<ApiService[]>([])
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [staticRows, setStaticRows] = useState<ServiceRow[]>([])
  const [visibleSections, setVisibleSections] = useState({
    camera: true,
    simType: true,
    mix: true,
    driver: true,
    options: true
  })
  const [initialized, setInitialized] = useState(false)
  const allSelected =
    services.length > 0 &&
    selectedIds.length === services.length

  const categories = [
    { label: 'FM Services', value: 'FMS' },
    { label: 'Driver Options', value: 'DRIVER_OPTIONS' },
  ]

  const [selectedCategory, setSelectedCategory] = useState<string>('FMS')

  useEffect(() => {
    if (!customerId) return

    api
      .get('/fm-customers/options', {
        params: { customerId }
      })
      .then(res => {
        const list = res.data?.data ?? res.data ?? []
        onOptionsChange(Array.isArray(list) ? list : [])
      })

  }, [customerId, readOnly])

  useEffect(() => {
    if (!expanded) return

    api.get('/fm-customers/services-by-category', {
      params: { priceLevel, category: selectedCategory }
    })
      .then(res => {
        const list = res.data?.data ?? res.data ?? []
        setServices(Array.isArray(list) ? list : [])
      })

  }, [priceLevel, expanded, selectedCategory])

  useEffect(() => {
    if (!customerId || initialized || staticRows.length === 0) return

    const merged = staticRows.map(sr => {
      const existing = value.find(v => v.productId === sr.productId)
      return existing ? { ...sr, ...existing } : sr
    })

    const dynamicOnly = value.filter(
      v => !staticRows.some(sr => sr.productId === v.productId)
    )

    const final = [...merged, ...dynamicOnly]

    setRows(final)
    setSelectedIds(value.map(v => v.productId))

    setInitialized(true)

  }, [staticRows, value, customerId, initialized])

  useEffect(() => {
    const loadStaticServices = async () => {
      const types = ['CAMERA', 'SIM_TYPE', 'MIX_SIM', 'MIX_VISION', 'MIX_UNIT']
      const responses = await Promise.all(
        types.map(type =>
          api.get('/fm-customers/services-by-category', {
            params: { category: type }
          })
        )
      )

      const rows: ServiceRow[] = []

      responses.forEach((res, index) => {
        const category = types[index]
        const list = res.data?.data ?? []

        list.forEach((s: any) => {
          rows.push({
            productId: s.id,
            productCode: s.productCode,
            numItems: 0,
            price: 0,
            category,
            active: 0,
            monthlyCharge: 0
          })
        })
      })
      setStaticRows(rows)
    }

    loadStaticServices()
  }, [])

  const applyServices = () => {

    const staticPart = rows.filter(r =>
      ['CAMERA', 'SIM_TYPE', 'MIX_SIM', 'MIX_VISION', 'MIX_UNIT'].includes(r.category)
    )

    const dynamicPart = rows.filter(
      r => r.category !== selectedCategory &&
        !['CAMERA', 'SIM_TYPE', 'MIX_SIM', 'MIX_VISION', 'MIX_UNIT'].includes(r.category)
    )

    const newRows = services
      .filter(s => selectedIds.includes(s.id))
      .map(s => {
        const existing = rows.find(r => r.productId === s.id)

        return existing
          ? existing
          : {
            productId: s.id,
            productCode: s.productCode,
            numItems: 0,
            price: Number(s.defaultPrice ?? 0),
            category: selectedCategory,
            active: 0,
            monthlyCharge: 0
          }
      })

    const finalRows = [
      ...staticPart,
      ...dynamicPart,
      ...newRows
    ]

    setRows(finalRows)
    onChange(finalRows)
    setExpanded(false)
  }

  // RegEx validation for service row fields (permits empty, 0, or positive numbers only)
  const updateRow = (
    productId: string,
    key: 'numItems' | 'price' | 'active' | 'monthlyCharge',
    rawValue: string
  ) => {
    if (rawValue !== '' && !/^\d*\.?\d*$/.test(rawValue)) {
      return
    }

    const numericValue = rawValue === '' ? 0 : Number(rawValue)

    const updated = rows.map(r =>
      r.productId === productId
        ? { ...r, [key]: numericValue }
        : r
    )

    setRows(updated)
    onChange(updated)
  }

  // RegEx validation for Options fields (permits empty, 0, or positive numbers only)
  const handleOptionChange = (
    id: string,
    key: 'charge' | 'vehicleCount',
    rawValue: string
  ) => {
    if (rawValue !== '' && !/^\d*\.?\d*$/.test(rawValue)) {
      return
    }

    const numericValue = rawValue === '' ? 0 : Number(rawValue)

    onOptionsChange(
      options.map(o =>
        o.id === id ? { ...o, [key]: numericValue } : o
      )
    )
  }

  function splitCameraItems(items: any[]) {
    const result: any[][] = []
    for (let i = 0; i < items.length; i += MAX_ROWS) {
      result.push(items.slice(i, i + MAX_ROWS))
    }
    return result
  }

  const categoryLabels: Record<string, string> = {
    FMS: "FM Services",
    CAMERA: "Camera",
    SIM_TYPE: "Sim Type",
    MIX_SIM: "Mix Sim Charge",
    MIX_VISION: "Mix Vision Charge",
    MIX_UNIT: "Mix Unit Code Charge"
  }

  const grouped = rows.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {} as Record<string, ServiceRow[]>)
  const fmServices = grouped['FMS'] ?? []
  const driverOptions = grouped['DRIVER_OPTIONS'] ?? []

  return (
    <div className="rounded-md border bg-white p-4">
      <div className="gap-4 items-start">
        {/* LEFT SIDE */}
        <div className="">
          <div className="flex justify-between mb-3">
            <h3 className="text-sm font-semibold">Services</h3>
            {!readOnly && (
              <Button size="sm" onClick={() => setExpanded(v => !v)}>
                {expanded ? 'Hide Services' : 'Show Services'}
              </Button>
            )}
          </div>
          {expanded && (
            <div className="border rounded-md p-4 mb-4 bg-gray-50">
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                  Service Categories
                </div>
                <div className="flex flex-wrap gap-6 p-3 border rounded-md bg-gray-50">
                  {categories.map(c => (
                    <label
                      key={c.value}
                      className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-1 rounded-md border
                  ${selectedCategory === c.value
                          ? "bg-blue-50 border-blue-400 text-blue-700"
                          : "bg-white border-gray-200"}
                `}
                    >
                      <Checkbox
                        label=""
                        checked={selectedCategory === c.value}
                        onChange={() => {
                          setSelectedCategory(c.value)
                          const existing = rows
                            .filter(r => r.category === c.value)
                            .map(r => r.productId)
                          setSelectedIds(existing)
                        }}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              {services.length > 0 ? (
                <>
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                    Services in {categories.find(c => c.value === selectedCategory)?.label}
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    <Checkbox
                      label=""
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) {
                          setSelectedIds([])
                        } else {
                          setSelectedIds(services.map(s => s.id))
                        }
                      }}
                    />
                    <span className="text-sm font-medium">
                      {allSelected ? 'Unselect All' : 'Select All'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto pr-2">
                    {services.map(s => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          label=""
                          checked={selectedIds.includes(s.id)}
                          onChange={() =>
                            setSelectedIds(p =>
                              p.includes(s.id)
                                ? p.filter(x => x !== s.id)
                                : [...p, s.id]
                            )
                          }
                        />
                        <span className="whitespace-nowrap">
                          {s.productCode}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button onClick={applyServices}>
                      Apply Services
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 italic py-4">
                  No services available for this category.
                </div>
              )}
            </div>
          )}

          {!customerId ? (
            <div className="text-sm text-gray-400 italic py-2">
              Select a customer to view services.
            </div>
          ) : (
            <div
              key={customerId}
              style={{
                animation: 'fadeInSections 0.4s ease both',
              }}
            >
              <style>{`
                @keyframes fadeInSections {
                  from { opacity: 0; transform: translateY(8px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* SimType */}
              <div className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      label=''
                      checked={visibleSections.simType}
                      onChange={() =>
                        setVisibleSections(v => ({ ...v, simType: !v.simType }))
                      }
                    />
                    <h4 className="font-semibold">Sim Type</h4>
                  </div>

                  {visibleSections.simType && (
                    <div className="w-full">
                      {['SIM_TYPE'].map(cat => {
                        const items = grouped[cat] ?? []
                        if (!items.length) return null
                        return (
                          <div key={cat}>
                            <div style={{ minWidth: 320 }}>
                              <table className="w-full border text-sm table-fixed">
                                <colgroup>
                                  <col style={{ width: '24%' }} />
                                  <col style={{ width: '19%' }} />
                                  <col style={{ width: '19%' }} />
                                  <col style={{ width: '19%' }} />
                                  <col style={{ width: '19%' }} />
                                </colgroup>
                                <thead>
                                  <tr className="h-8">
                                    <th className="px-1 py-1 text-left font-medium text-xs">Service</th>
                                    <th className="px-1 py-1 text-left font-medium text-xs">Num</th>
                                    <th className="px-1 py-1 text-left font-medium text-xs">Active</th>
                                    <th className="px-1 py-1 text-left font-medium text-xs">Monthly Charge</th>
                                    <th className="px-1 py-1 text-left font-medium text-xs">Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map(r => (
                                    <tr key={r.productId} className="h-9">
                                      <td className="px-1 py-1 text-sm">{r.productCode}</td>
                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          disabled={readOnly}
                                          value={r.numItems}
                                          onChange={e => updateRow(r.productId, 'numItems', e.target.value)}
                                          className="w-full h-7 text-xs px-1"
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          disabled={readOnly}
                                          value={r.active ?? 0}
                                          onChange={e => updateRow(r.productId, 'active', e.target.value)}
                                          className="w-full h-7 text-xs px-1"
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          disabled={readOnly}
                                          value={r.monthlyCharge ?? 0}
                                          onChange={e => updateRow(r.productId, 'monthlyCharge', e.target.value)}
                                          className="w-full h-7 text-xs px-1"
                                        />
                                      </td>
                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          disabled={readOnly}
                                          value={r.price}
                                          onChange={e => updateRow(r.productId, 'price', e.target.value)}
                                          className="w-full h-7 text-xs px-1"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="col-span-7">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      label=''
                      checked={visibleSections.camera}
                      onChange={() =>
                        setVisibleSections(v => ({ ...v, camera: !v.camera }))
                      }
                    />
                    <h4 className="font-semibold">Camera</h4>
                  </div>

                  {visibleSections.camera && (
                    <div className="w-full">
                      {['CAMERA'].map(cat => {
                        const items = grouped[cat] ?? []
                        if (!items.length) return null

                        const columns = splitCameraItems(items)

                        return (
                          <div key={cat} className="flex gap-4">
                            {columns.map((col, idx) => (
                              <table key={idx} className="flex-1 border text-sm table-fixed">
                                <colgroup>
                                  <col style={{ width: '24%' }} />
                                  <col style={{ width: '19%' }} />
                                  <col style={{ width: '19%' }} />
                                  <col style={{ width: '19%' }} />
                                  <col style={{ width: '19%' }} />
                                </colgroup>
                                <thead>
                                  <tr className="h-8">
                                    <th className="px-1 py-1 text-left text-xs">Service</th>
                                    <th className="px-1 py-1 text-left text-xs">Num</th>
                                    <th className="px-1 py-1 text-left text-xs">Active</th>
                                    <th className="px-1 py-1 text-left text-xs">Monthly Charge</th>
                                    <th className="px-1 py-1 text-left text-xs">Price</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {Array.from({ length: MAX_ROWS }).map((_, i) => {
                                    const r = col[i]

                                    return (
                                      <tr key={r?.productId ?? `empty-${i}`} className="h-9">
                                        {r ? (
                                          <>
                                            <td className="px-1 py-1 text-sm">{r.productCode}</td>

                                            <td className="px-1 py-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                disabled={readOnly}
                                                value={r.numItems}
                                                onChange={e => updateRow(r.productId, 'numItems', e.target.value)}
                                                readOnly
                                                className="w-full h-7 text-xs px-1"
                                              />
                                            </td>

                                            <td className="px-1 py-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                disabled={readOnly}
                                                value={r.active ?? 0}
                                                onChange={e => updateRow(r.productId, 'active', e.target.value)}
                                                className="w-full h-7 text-xs px-1"
                                              />
                                            </td>

                                            <td className="px-1 py-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                disabled={readOnly}
                                                value={r.monthlyCharge ?? 0}
                                                onChange={e => updateRow(r.productId, 'monthlyCharge', e.target.value)}
                                                className="w-full h-7 text-xs px-1"
                                              />
                                            </td>

                                            <td className="px-1 py-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                disabled={readOnly}
                                                value={r.price}
                                                onChange={e => updateRow(r.productId, 'price', e.target.value)}
                                                className="w-full h-7 text-xs px-1"
                                              />
                                            </td>
                                          </>
                                        ) : (
                                          <td colSpan={5}></td>
                                        )}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Options & Driver Options */}
              <div className="grid grid-cols-5 gap-4 mb-6 items-start">
                <div className="col-span-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      label=""
                      checked={visibleSections.options}
                      onChange={() =>
                        setVisibleSections(v => ({ ...v, options: !v.options }))
                      }
                    />
                    <h4 className="font-semibold">Options</h4>
                  </div>
                  {visibleSections.options && (
                    <div className="grid grid-cols-3 gap-3">
                      {Array.isArray(options) && options.map(opt => (
                        <div
                          key={opt.id}
                          className="border rounded-md p-2 text-xs bg-gray-50"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Checkbox
                              label=""
                              checked={opt.enabled}
                              disabled={readOnly}
                              onChange={() =>
                                onOptionsChange(
                                  options.map(o =>
                                    o.id === opt.id
                                      ? { ...o, enabled: !o.enabled }
                                      : o
                                  )
                                )
                              }
                            />
                            <span className="font-medium text-gray-700">
                              {opt.label}
                            </span>
                          </div>

                          {opt.enabled && (
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div>
                                <label className="text-[10px] text-gray-500">Charge</label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={opt.charge}
                                  disabled={readOnly}
                                  className="h-7 text-xs"
                                  onChange={e => handleOptionChange(opt.id, 'charge', e.target.value)}
                                  />
                              </div>

                              <div>
                                <label className="text-[10px] text-gray-500">Veh</label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={opt.vehicleCount}
                                  disabled={readOnly}
                                  className="h-7 text-xs"
                                  onChange={e => handleOptionChange(opt.id, 'vehicleCount', e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      label=''
                      checked={visibleSections.driver}
                      onChange={() =>
                        setVisibleSections(v => ({ ...v, driver: !v.driver }))
                      }
                    />
                    <h4 className="font-semibold">Driver Options</h4>
                  </div>

                  {visibleSections.driver && driverOptions.length > 0 && (
                    <div className="w-full overflow-x-auto">
                      <table className="w-full border text-sm table-fixed" style={{ minWidth: 280 }}>
                        <colgroup>
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '18%' }} />
                          <col style={{ width: '18%' }} />
                          <col style={{ width: '18%' }} />
                          <col style={{ width: '20%' }} />
                        </colgroup>
                        <thead>
                          <tr className="h-8">
                            <th className="px-1 py-1 text-left font-medium text-xs">Service</th>
                            <th className="px-1 py-1 text-left font-medium text-xs">Num</th>
                            <th className="px-1 py-1 text-left font-medium text-xs">Active</th>
                            <th className="px-1 py-1 text-left font-medium text-xs">Monthly Charge</th>
                            <th className="px-1 py-1 text-left font-medium text-xs">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverOptions.map(r => (
                            <tr key={r.productId} className="h-9">
                              <td className="px-1 py-1">{r.productCode}</td>

                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={r.numItems}
                                  disabled={readOnly}
                                  onChange={e => updateRow(r.productId, 'numItems', e.target.value)}
                                  className="w-full h-7 text-xs px-1"
                                />
                              </td>

                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={r.active ?? 0}
                                  disabled={readOnly}
                                  onChange={e => updateRow(r.productId, 'active', e.target.value)}
                                  className="w-full h-7 text-xs px-1"
                                />
                              </td>

                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={r.monthlyCharge ?? 0}
                                  disabled={readOnly}
                                  onChange={e => updateRow(r.productId, 'monthlyCharge', e.target.value)}
                                  className="w-full h-7 text-xs px-1"
                                />
                              </td>

                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={r.price}
                                  disabled={readOnly}
                                  onChange={e => updateRow(r.productId, 'price', e.target.value)}
                                  className="w-full h-7 text-xs px-1"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Mix Services */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    label=''
                    checked={visibleSections.mix}
                    onChange={() =>
                      setVisibleSections(v => ({ ...v, mix: !v.mix }))
                    }
                  />
                  <h4 className="font-semibold">Mix Services</h4>
                </div>
                {visibleSections.mix && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="w-full md:col-span-2 xl:col-span-3">
                      <div className="grid grid-cols-2 gap-4">
                        {/* LEFT COLUMN (MIX_SIM + MIX_VISION) */}
                        <div className="space-y-4">
                          {['MIX_SIM', 'MIX_VISION'].map(cat => {
                            const items = grouped[cat] ?? []
                            if (!items.length) return null

                            return (
                              <table key={cat} className="w-full border text-sm">
                                <thead>
                                  <tr className="h-8">
                                    <th className="px-1 py-1 text-left">Service</th>
                                    <th className="px-1 py-1 text-left">Num</th>
                                    <th className="px-1 py-1 text-left">Active</th>
                                    <th className="px-1 py-1 text-left">Monthly Charge</th>
                                    <th className="px-1 py-1 text-left">Price</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {items.map(r => (
                                    <tr key={r.productId} className="h-9">
                                      <td className="px-1 py-1">{r.productCode}</td>

                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={r.numItems}
                                          onChange={e => updateRow(r.productId, 'numItems', e.target.value)}
                                          readOnly
                                          disabled={readOnly}
                                          className="w-12 h-7"
                                        />
                                      </td>

                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={r.active ?? 0}
                                          disabled={readOnly}
                                          onChange={e => updateRow(r.productId, 'active', e.target.value)}
                                          className="w-12 h-7"
                                        />
                                      </td>

                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={r.monthlyCharge ?? 0}
                                          disabled={readOnly}
                                          onChange={e => updateRow(r.productId, 'monthlyCharge', e.target.value)}
                                          className="w-12 h-7"
                                        />
                                      </td>

                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={r.price}
                                          disabled={readOnly}
                                          onChange={e => updateRow(r.productId, 'price', e.target.value)}
                                          className="w-14 h-7"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )
                          })}
                        </div>

                        {/* RIGHT COLUMN (MIX_UNIT) */}
                        <div>
                          {['MIX_UNIT'].map(cat => {
                            const items = grouped[cat] ?? []
                            if (!items.length) return null

                            return (
                              <table key={cat} className="w-full border text-sm">
                                <thead>
                                  <tr className="h-8">
                                    <th className="px-1 py-1 text-left">Service</th>
                                    <th className="px-1 py-1 text-left">Num</th>
                                    <th className="px-1 py-1 text-left">Active</th>
                                    <th className="px-1 py-1 text-left">Monthly Charge</th>
                                    <th className="px-1 py-1 text-left">Price</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {items.map(r => (
                                    <tr key={r.productId} className="h-9">
                                      <td className="px-1 py-1">{r.productCode}</td>

                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={r.numItems}
                                          onChange={e => updateRow(r.productId, 'numItems', e.target.value)}
                                          readOnly
                                          disabled={readOnly}
                                          className="w-12 h-7"
                                        />
                                      </td>

                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={r.active ?? 0}
                                          disabled={readOnly}
                                          onChange={e => updateRow(r.productId, 'active', e.target.value)}
                                          className="w-12 h-7"
                                        />
                                      </td>

                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={r.monthlyCharge ?? 0}
                                          disabled={readOnly}
                                          onChange={e => updateRow(r.productId, 'monthlyCharge', e.target.value)}
                                          className="w-12 h-7"
                                        />
                                      </td>

                                      <td className="px-1 py-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={r.price}
                                          disabled={readOnly}
                                          onChange={e => updateRow(r.productId, 'price', e.target.value)}
                                          className="w-14 h-7"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE FM SERVICES */}
        <div className="xl:col-span-4 col-span-12">
          {fmServices.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-sm">
                {categoryLabels['FMS']}
              </h4>
              <div className="overflow-x-auto">
                <table className="border text-sm table-fixed" style={{ minWidth: 340, width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '24%' }} />
                  </colgroup>
                  <thead>
                    <tr className="h-8 bg-gray-50">
                      <th className="px-1 py-1 text-left font-medium text-xs">Service</th>
                      <th className="px-1 py-1 text-left font-medium text-xs">Num</th>
                      <th className="px-1 py-1 text-left font-medium text-xs">Active</th>
                      <th className="px-1 py-1 text-left font-medium text-xs">Monthly Charge</th>
                      <th className="px-1 py-1 text-left font-medium text-xs">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fmServices.map(r => (
                      <tr key={r.productId} className="h-9">
                        <td className="px-1 py-1 text-xs font-medium truncate max-w-0">{r.productCode}</td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min="0"
                            disabled={readOnly}
                            value={r.numItems}
                            onChange={e => updateRow(r.productId, 'numItems', e.target.value)}
                            className="w-full h-7 text-xs px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min="0"
                            value={r.active ?? 0}
                            disabled={readOnly}
                            onChange={e => updateRow(r.productId, 'active', e.target.value)}
                            className="w-full h-7 text-xs px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min="0"
                            value={r.monthlyCharge ?? 0}
                            disabled={readOnly}
                            onChange={e => updateRow(r.productId, 'monthlyCharge', e.target.value)}
                            className="w-full h-7 text-xs px-1"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min="0"
                            disabled={readOnly}
                            value={r.price}
                            onChange={e => updateRow(r.productId, 'price', e.target.value)}
                            className="w-full h-7 text-xs px-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}