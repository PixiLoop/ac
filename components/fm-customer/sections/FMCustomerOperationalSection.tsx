'use client'

import { useEffect, useState } from 'react'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxValue } from '../../ui/combobox'
import { api } from '../../../lib/api-client'
import { useToast } from '../../ui/toast'
import { Label } from '../../ui/label'

type Operational = {
  depots: string
  invPeriod: string
  volOffset: string
  invoiceBy: string
  sortBy: string
  listBy: string
  organizations: any[]
}

type PriceLevel =
  | ''
  | 'RETAIL'
  | 'TRADE'
  | 'SALES_PARTNER'
  | 'AGENT'
  | 'LANDED'

type Props = {
  value: Operational
  onChange: (v: Operational) => void

  priceLevel: PriceLevel
  onPriceLevelChange: (v: PriceLevel) => void

  priceFactor: string
  onPriceFactorChange: (v: string) => void

  readOnly?: boolean
}

export function FMCustomerOperationalSection({ value, onChange, priceLevel,
  onPriceLevelChange,
  priceFactor,
  onPriceFactorChange, readOnly }: Props) {
  const update = (key: keyof Operational, v: any) => {
    onChange({ ...value, [key]: v })
  }
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations');

      setRows(res.data?.data ?? res.data ?? []);
    } catch {
      showToast({ type: 'error', title: 'Failed to load organizations' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);


  return (
    <div className="rounded-md border bg-white p-4">
      {/* <h3 className="mb-4 text-sm font-semibold">Subscription</h3> */}

      <div className="grid grid-cols-3 gap-4 mb-3">
        <Input
          label="Depots"
          disabled={readOnly}
          value={value.depots}
          numeric
          maxDigits={3}
          onChange={e => update('depots', e.target.value)}
        />

        <Input
          label="Invoice Period"
          disabled={readOnly}
          value={value.invPeriod}
          numeric
          maxDigits={2}
          onChange={e => update('invPeriod', e.target.value)}
        />

        <Input
          label="VOL Offset"
          disabled={readOnly}
          value={value.volOffset}
          onChange={e => update('volOffset', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Select
          disabled={readOnly}
          label="Invoice By"
          value={value.invoiceBy}
          onChange={v => update('invoiceBy', v)}
          options={[
            { label: 'All Units', value: 'ALL_UNITS' },
            { label: 'FM Service', value: 'FM_SERVICE' },
          ]}
        />

        {value.invoiceBy === "ALL_UNITS" && <Select
          disabled={readOnly}
          label="Sort By"
          value={value.sortBy}
          onChange={v => update('sortBy', v)}
          options={[
            { label: 'No Sort', value: 'NO_SORT' },
            { label: 'FM Service', value: 'FM_SERVICE' },
            { label: 'Depot', value: 'DEPOT' },
          ]}
        />}

        <Select
          label="List By"
          disabled={readOnly}
          value={value.listBy}
          onChange={v => update('listBy', v)}
          options={[
            { label: 'All Units', value: 'ALL_UNITS' },
            { label: 'Fleet Num', value: 'FLEET_NUM' },
            { label: 'Rego', value: 'REGO' },
          ]}
        />


        <Select
          label="FM Product Price Level"
          disabled={readOnly}
          value={priceLevel}
          onChange={v => onPriceLevelChange(v as PriceLevel)}
          options={[
            { label: 'Retail Price', value: 'RETAIL' },
            { label: 'Sales Partner', value: 'SALES_PARTNER' },
            { label: 'Trade Price', value: 'TRADE' },
            { label: 'Agent Price', value: 'AGENT' },
            { label: 'Landed Cost', value: 'LANDED' },
          ]}
        />

        <Input
          label="FM Product Price Factor"
          type="text"
          value={priceFactor}
          disabled={readOnly}
          numeric
          maxDigits={5}
          onChange={e => onPriceFactorChange(e.target.value)}
        />
        <div className='col-span-3'>
          <Label>Organizations</Label>
          <Combobox
            items={rows}
            multiple
            value={value.organizations}
            onValueChange={e => {
              update("organizations", e)
            }}
          >
            <ComboboxChips className={"p-0"}>
              <ComboboxValue>
                {value.organizations.map((item) => (
                  <ComboboxChip key={item.id}>{item.label}</ComboboxChip>
                ))}
              </ComboboxValue>
              <ComboboxChipsInput placeholder="Add organization" />
            </ComboboxChips>
            <ComboboxContent className={"bg-white"}>
              <ComboboxEmpty>No items found.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </div>
    </div>
  )
}
