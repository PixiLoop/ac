import { FormSection } from '../../forms/FormSection';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';

export function SalesOrderShippingSection({
  value,
  update,
  defaultOpen = false,
}: any) {
  return (
    <FormSection title="Shipping Details" defaultOpen={defaultOpen}>
      <div className="grid md:grid-cols-3 gap-4">
        <Input
          label="Name"
          placeholder="Recipient name"
          value={value.shippingName}
          onChange={e => update('shippingName', e.target.value)}
        />

        <Input
          label="Address 1"
          placeholder="Street address"
          value={value.shippingAddress1}
          onChange={e => update('shippingAddress1', e.target.value)}
        />

        <Input
          label="Address 2"
          placeholder="Apartment / Suite"
          value={value.shippingAddress2}
          onChange={e => update('shippingAddress2', e.target.value)}
        />

        <Input
          label="Address 3"
          placeholder="City / State / Postcode"
          value={value.shippingAddress3}
          onChange={e => update('shippingAddress3', e.target.value)}
        />
      </div>

      <div className="mt-3">
        <Checkbox
            label="Same as Shipping Details (copy to account)"
            checked={value.sameAsCustomer}
            onChange={(checked: boolean) =>
                update('sameAsCustomer', checked)
            }
        />

      </div>
    </FormSection>
  );
}
