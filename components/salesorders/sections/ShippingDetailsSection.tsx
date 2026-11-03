'use client';

import { FormSection } from '../../forms/FormSection';
import { Input } from '../../ui/input';

function buildShippingQuery(value: any) {
  return [
    value?.address1,
    value?.address2,
    value?.city,
    value?.state,
    value?.postcode,
    value?.country || 'Australia',
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function ShippingDetailsSection({
  value,
  update,
  readOnly = false,
  defaultOpen = true,
  showMap = true,
}: {
  value: any;
  update: (key: string, value: any) => void;
  readOnly?: boolean;
  defaultOpen?: boolean;
  showMap?: boolean;
}) {
  const disabled = readOnly;
  const mapQuery = buildShippingQuery(value);

  return (
    <FormSection title="Shipping Details" defaultOpen={defaultOpen}>
      <div className="space-y-3">
        <Input
          label="Name"
          value={value.shippingName}
          onChange={(e) => update('shippingName', e.target.value)}
          disabled={disabled}
        />

        <Input
          label="Address 1"
          value={value.address1}
          onChange={(e) => update('address1', e.target.value)}
          disabled={disabled}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Input
            label="City"
            value={value.city}
            onChange={(e) => update('city', e.target.value)}
            disabled={disabled}
          />

          <Input
            label="State"
            value={value.state}
            onChange={(e) => update('state', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Input
            label="Postcode"
            value={value.postcode}
            onChange={(e) => update('postcode', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </FormSection>
  );
}
