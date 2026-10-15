'use client';

import { FormSection } from '../../forms/FormSection';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';

export function ShippingDetailsSection({
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
  //const disabled = readOnly || value.sameAsCustomer;
  const disabled = readOnly; // || value.sameAsCustomer
  return (
    <FormSection
      title="Shipping Details"
      defaultOpen={defaultOpen}
    // rightAction={
    //   <Checkbox
    //     label="Same as Customer"
    //     checked={value.sameAsCustomer}
    //     onChange={(v: boolean) => update('sameAsCustomer', v)}
    //   />
    // }
    >
      <div className="space-y-3">
        {/* NAME */}
        <Input
          label="Name"
          value={value.shippingName}
          onChange={e => update('shippingName', e.target.value)}
          disabled={disabled}
        />

        {/* ADDRESS 1 */}
        <Input
          label="Address 1"
          value={value.address1}
          onChange={e => update('address1', e.target.value)}
          disabled={disabled}
        />

        {/* CITY + STATE (SAME ROW) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Input
            label="City"
            value={value.city}
            onChange={e => update('city', e.target.value)}
            disabled={disabled}
          />

          <Input
            label="State"
            value={value.state}
            onChange={e => update('state', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Input
            label="Postcode"
            value={value.postcode}
            onChange={e => update('postcode', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </FormSection>
  );
}
