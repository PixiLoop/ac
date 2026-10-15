'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminShell } from '../../../../components/layout/AdminShell'
import { Button } from '../../../../components/ui/button'
import { api } from '../../../../lib/api-client'

import { FMCustomerDetailsSection } from '../../../../components/fm-customer/sections/FMCustomerDetailsSection'
import { FMCustomerOperationalSection } from '../../../../components/fm-customer/sections/FMCustomerOperationalSection'
//import { FMCustomerPricingSection } from '../../../../components/fm-customer/sections/FMCustomerPricingSection'
import { FMCustomerServicesSection } from '../../../../components/fm-customer/sections/FMCustomerServicesSection'
import { FMCustomerSummarySection } from '../../../../components/fm-customer/sections/FMCustomerSummarySection'
import { FMSubscriptionReportsSection } from '../../../../components/fm-customer/sections/FMSubscriptionReportsSection'
import { useToast } from '../../../../components/ui/toast'

type Operational = {
  depots: string
  invPeriod: string
  volOffset: string
  invoiceBy: string
  sortBy: string
  listBy: string
  organizations: any[]
}

type FMDetails = {
  fmWebNumber: string
  fleetName: string
  mixOrgId: string
  mixDBase: string
}

type FMCustomerPageProps = {
  initialCustomerId?: string
  readOnly?: boolean
}

export default function FMCustomerPage({
  initialCustomerId,
  readOnly = false,
}: FMCustomerPageProps) {
  const { showToast } = useToast()
  const router = useRouter()
  const [customer, setCustomer] = useState<any | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [fmDetails, setFmDetails] = useState<FMDetails>({
    fmWebNumber: '',
    fleetName: '',
    mixOrgId: '',
    mixDBase: '',
  })

  const [priceLevel, setPriceLevel] =
    useState<'RETAIL' | 'TRADE' | 'SALES_PARTNER' | 'AGENT' | 'LANDED' | ''>('')
  const [priceFactor, setPriceFactor] = useState<string>('')
  const [operational, setOperational] = useState<Operational>({
    depots: '',
    invPeriod: '',
    volOffset: '',
    invoiceBy: '',
    sortBy: '',
    listBy: '',
    organizations: []
  })

  const [services, setServices] = useState<
    {
      productId: string
      productCode: string
      numItems: number
      price: number
      monthlyCharge?: number
      category: string
      active?: number
      charge?: number
    }[]
  >([])


  type Option = {
    id: string
    label: string
    enabled: boolean
    charge: number
    vehicleCount: number
  }

  const [options, setOptions] = useState<Option[]>([])

  const [fmRecordId, setFmRecordId] = useState<string | null>(null)

  const handleCustomerSelect = async (c: any) => {
    console.log('CUSTOMER SELECTED', c)
    setCustomer(c)
    setCustomerId(c.id)

    const res = await api.get(`/fm-customers/by-customer/${c.id}`)
    const fm = res.data?.data
    if (fm?.id) {
      router.push(`/admin/fm-customers/${fm.id}`)
      return
    }
    // NEW customer
    if (!fm) {

      setOperational({
        depots: '',
        invPeriod: '',
        volOffset: '',
        invoiceBy: '',
        sortBy: '',
        listBy: '',
        organizations: []
      })

      setFmDetails({
        fmWebNumber: '',
        fleetName: '',
        mixOrgId: '',
        mixDBase: '',
      })

      setServices([])
      return
    }
    //EXISTING customer
    hydrateFromFM(fm)
  }

  useEffect(() => {
    if (!initialCustomerId) return

      ; (async () => {
        try {
          const fmRes = await api.get(
            `/fm-customers/${initialCustomerId}`,
          )
          const fm = fmRes.data?.data ?? fmRes.data
          if (!fm) return
          const customerRes = await api.get(
            `/customers/${fm.customerId}`,
          )

          setCustomer(customerRes.data?.data ?? customerRes.data)
          setCustomerId(fm.customerId)
          setFmRecordId(fm.id)
          hydrateFromFM(fm)

        } catch (err) {
          console.error(err)
          showToast({
            type: 'error',
            title: 'Failed to load FM Customer',
          })
        }
      })()
  }, [initialCustomerId])


  const hydrateFromFM = (fm: any) => {
    setPriceLevel(fm.priceLevel ?? '')
    setPriceFactor(fm.priceFactor?.toString() ?? '')

    setOperational({
      depots: fm.depots ?? '',
      invPeriod: fm.invPeriod ?? '',
      volOffset: fm.volOffset ?? '',
      invoiceBy: fm.invoiceBy ?? '',
      sortBy: fm.sortBy ?? '',
      listBy: fm.listBy ?? '',
      organizations: fm.FMCustomerOrgIds ? fm.FMCustomerOrgIds.map(item => ({ ...item.organizations })) : []
    })

    setFmDetails({
      fmWebNumber: fm.fmWebNumber ?? '',
      fleetName: fm.fleetName ?? '',
      mixOrgId: fm.mixOrgId ?? '',
      mixDBase: fm.mixDBase ?? '',
    })

    //FMS + DRIVER
    const dynamic = (fm.services ?? []).map((s: any) => ({
      productId: s.productId,
      productCode: s.product?.productCode ?? '',
      numItems: s.numItems ?? 0,
      price: Number(s.price ?? 0),
      category: s.product?.productCategory,
      active: s.active ?? 0,
      charge: s.charge ?? 0,
      monthlyCharge: s.monthlyCharge ?? 0
    }))

    //CAMERA / SIM / MIX
    const staticItems = (fm.cameraSimMixServices ?? []).map((s: any) => ({
      productId: s.serviceId,
      productCode: s.service?.label ?? '',
      numItems: s.numItems ?? 0,
      price: Number(s.price ?? 0),
      category: s.service?.type,
      active: s.active ?? 0,
      charge: 0,
      monthlyCharge: s.monthlyCharge ?? 0
    }))

    setServices([...dynamic, ...staticItems])
  }

  const saveFMCustomer = async () => {
    if (!customerId) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Select customer first',
      })
      return
    }

    if (!priceLevel) {
      showToast({ type: 'error', title: 'Price level is required' })
      return
    }

    if (!priceFactor) {
      showToast({ type: 'error', title: 'Price factor is required' })
      return
    }

    setSaving(true)

    try {
      await api.post('/fm-customers', {
        customerId,
        priceLevel: priceLevel || null,
        priceFactor: priceFactor ? Number(priceFactor) : null,
        ...operational,
        ...fmDetails,
        services: services.map(s => ({
          productId: s.productId,
          numItems: s.numItems,
          price: s.price,
          active: s.active ?? 0,
          charge: s.charge ?? 0,
          monthlyCharge: s.monthlyCharge ?? 0,
        })),
        options: options.map(o => ({
          optionId: o.id,
          enabled: o.enabled,
          charge: o.charge,
          vehicleCount: o.vehicleCount
        }))
      })

      showToast({
        type: 'success',
        title: 'FM Customer',
        message: 'FM customer saved successfully',
      })

      router.push('/admin/fm-customers')
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message:
          err?.response?.data?.message ||
          'Unexpected error while saving FM customer',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell title="FM Customer">
      <div className="space-y-4">
        {readOnly && (
          <div className="flex justify-end gap-2">
            <Button onClick={() => router.push(`/admin/fm-customers/${initialCustomerId}`)}>
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/fm-customers')}
            >
              Back
            </Button>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <FMCustomerDetailsSection
              customer={customer}
              value={fmDetails}
              onChange={setFmDetails}
              onCustomerSelect={handleCustomerSelect}
              readOnly={readOnly}
            />
          </div>

          <div className="col-span-4">
            <FMCustomerOperationalSection
              value={operational}
              onChange={setOperational}
              priceLevel={priceLevel}
              onPriceLevelChange={setPriceLevel}
              priceFactor={priceFactor}
              onPriceFactorChange={setPriceFactor}
              readOnly={readOnly}
            />
          </div>










          <div className="col-span-4">
            <FMCustomerSummarySection />
          </div>

          {/* <div className="col-span-4">
            <FMCustomerPricingSection
              priceLevel={priceLevel}
              onPriceLevelChange={setPriceLevel}
              priceFactor={priceFactor}
              onPriceFactorChange={setPriceFactor}
              readOnly={readOnly}
            />
          </div> */}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <FMCustomerServicesSection
              priceLevel={priceLevel}
              value={services}
              onChange={setServices}
              options={options}
              onOptionsChange={setOptions}
              customerId={customerId ?? undefined}
              readOnly={readOnly}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <FMSubscriptionReportsSection
              fmCustomerId={fmRecordId ?? initialCustomerId}
              readOnly={readOnly}
            />
          </div>
        </div>

        {!readOnly && (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/fm-customers')}
            >
              Cancel
            </Button>

            <Button onClick={saveFMCustomer} loading={saving}>
              Save FM Customer
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
