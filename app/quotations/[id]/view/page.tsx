'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '../../../../components/layout/AdminShell';
import { QuotationForm } from '../../../../components/quotations/QuotationForm';
import { api } from '../../../../lib/api-client';

export default function ViewQuotationPage() {
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
        console.log("so view data", data)
        setQuotation(mapQuotationToForm(data));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminShell title="View Quotation">
        <div className="p-6">Loading...</div>
      </AdminShell>
    );
  }

  if (!quotation) {
    return (
      <AdminShell title="View Quotation">
        <div className="p-6">Quotation not found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={`Quotation ${quotation.quoteNumber}`}>
      <QuotationForm
        mode="view"
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

    billingName: data.billingName,
    billingAddress1: data.billingAddress1,
    billingCity: data.billingCity,
    billingState: data.billingState,
    billingPostcode: data.billingPostcode,

    hasPremium: data.hasPremium,
    hasEssential: data.hasEssential,
    hasOngoing: data.hasOngoing,

    groups: data.groups,
  };
}