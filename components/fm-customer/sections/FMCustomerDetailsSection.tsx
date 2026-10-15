'use client'

import { useRef } from 'react'
import { Input } from '../../../components/ui/input'
import { CustomerSelect } from '../../../components/common/CustomerSelect'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'

type FMDetails = {
  fmWebNumber: string
  fleetName: string
  mixOrgId: string
  mixDBase: string,
}

type Props = {
  customer: any | null
  value: FMDetails
  onCustomerSelect: (customer: any) => void
  onChange: (v: FMDetails) => void,
  readOnly?: boolean
}

export function FMCustomerDetailsSection({
  customer,
  value,
  onCustomerSelect,
  onChange,
  readOnly
}: Props) {
  const fleetRef = useRef<HTMLInputElement>(null)

  const update = (key: keyof FMDetails, v: string) => {
    onChange({ ...value, [key]: v })
  }

  const router = useRouter()

  return (
    <div className="rounded-md border bg-white p-4">
      {/* <h3 className="mb-4 text-sm font-semibold">Customer / FM</h3> */}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Customer</label>

            {customer?.id && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/customers/${customer.id}/view`)
                }
                className="text-slate-400 hover:text-slate-700 transition"
                title="Open customer details"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <CustomerSelect
            value={customer}
            disabled={readOnly}
            onSelect={c => {
              onCustomerSelect(c)
              setTimeout(() => fleetRef.current?.focus(), 0)

            }}
          />
        </div>

        <div>
          <label className="text-sm">Customer Name</label>
          <Input value={customer?.name ?? ''} disabled={readOnly} />
        </div>

        <div>
          <label className="text-sm">FM Web Number</label>
          <Input value={value.fmWebNumber} disabled={readOnly} />
        </div>

        <div>
          <label className="text-sm">Fleet Name</label>
          <Input
            ref={fleetRef}
            value={value.fleetName}
            disabled={readOnly}
            onChange={e => update('fleetName', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">MIX Org ID</label>
          <Input
            value={value.mixOrgId}
            disabled={readOnly}
            onChange={e => update('mixOrgId', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">MiX DBase Name</label>
          <Input
            value={value.mixDBase}
            disabled={readOnly}
            onChange={e => update('mixDBase', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
