'use client';

import { FormSection } from '../../forms/FormSection';
import { Input } from '../../ui/input';

export function AccountDetailsSection({
  value,
  update,
  readOnly = false,
  defaultOpen = true,
}: {
  value: any;
  update: (key: string, value: any) => void;
  readOnly?: boolean;
  defaultOpen?: boolean;
}) {
  const disabled = readOnly;

  return (
    <FormSection
      title="Account Details"
      defaultOpen={defaultOpen}
    >
      <div className="space-y-3">
        {/* NAME */}
        <Input
          label="Name"
          value={value.billingName}
          onChange={e => update('billingName', e.target.value)}
          readOnly
        />

        {/* ADDRESS 1 */}
        <Input
          label="Address 1"
          value={value.address1}
          onChange={e => update('address1', e.target.value)}
          readOnly
        />

        {/* CITY + STATE (SAME ROW) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Input
            label="City"
            value={value.city}
            onChange={e => update('city', e.target.value)}
            readOnly
          />

          <Input
            label="State"
            value={value.state}
            onChange={e => update('state', e.target.value)}
            readOnly
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Input
            label="Postcode"
            value={value.postcode}
            onChange={e => update('postcode', e.target.value)}
            readOnly
          />
        </div>
      </div>
    </FormSection>
  );
}
