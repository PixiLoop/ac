'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '../../../components/layout/AdminShell';
import { QuotationForm } from '../../../components/quotations/QuotationForm';
import { api } from '../../../lib/api-client';

export default function EditQuotationPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    api
      .get(`/quotations/${id}`)
      .then(res => {
        const data = res.data?.data ?? res.data;
        console.log('quotation data:', data);
        setQuotation(mapQuotationToForm(data));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminShell title="Edit Quotation">
        <div className="p-6">Loading...</div>
      </AdminShell>
    );
  }

  if (!quotation) {
    return (
      <AdminShell title="Edit Quotation">
        <div className="p-6">Quotation not found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Edit Quotation">
      {/* <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={() => router.push('/quotations')}
        >
          Back
        </Button>        
      </div> */}

      <QuotationForm
        mode="edit"
        initialData={quotation}
      />
    </AdminShell>
  );
}

function mapQuotationToForm(data: any) {

  return {
    id: data.id,
    quoteNumber: data.quoteNumber,
    status: data.status,
    salesOrderId: data.salesOrderId,
    customerId: data.customerId,

    requestNumber: data.requestNumber,

    quotationDate: data.quotationDate,
    expiryDate: data.expiryDate,

    priceLevel: data.priceLevel,
    paymentTerms: data.paymentTerms,
    salesFactor: data.salesFactor,

    sundries: data.sundries,
    labour: data.labour,
    rounding: data.rounding,
    otherCharges: data.otherCharges,

    shippingName: data.shippingName,
    address1: data.shippingAddress1,
    city: data.shippingCity,
    state: data.shippingState,
    postcode: data.shippingPostcode,

    accountName: data.billingName,
    accountAddress1: data.billingAddress1,
    accountCity: data.billingCity,
    accountState: data.billingState,
    accountPostcode: data.billingPostcode,

    hasPremium: data.hasPremium,
    hasEssential: data.hasEssential,
    hasOngoing: data.hasOngoing,
    gstExempt: data.customer.gstExempt,
    groups: data.groups,
    dispatchMethod: data.dispatchMethod ?? '',
  }

}