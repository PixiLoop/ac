'use client';

import { AdminShell } from '../../../components/layout/AdminShell';
import { FormSection } from '../../../components/forms/FormSection';
import { CustomerDetailsForm } from '../../../components/customers/forms/CustomerDetailsForm';

export default function NewCustomerPage() {
  return (
    <AdminShell title="Create Customer">
      <FormSection title="Customer Details" required defaultOpen>
        <CustomerDetailsForm />
      </FormSection>
    </AdminShell>
  );
}
