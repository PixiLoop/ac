import { FormSection } from '../../../components/forms/FormSection';
import { SalesOrderDetailsForm } from '../forms/SalesOrderDetailsForm';

export function SalesOrderDetailsSection({
  value,
  update,
  defaultOpen = false,
  freight,
  setFreight,
  readOnly = false,
  title = 'Sales Order Details',
  selectedCustomer = null,
}: any) {
  return (
    <FormSection
      title={title}
      required
      defaultOpen={defaultOpen}
    >
      <SalesOrderDetailsForm value={value} update={update}
        freight={freight}
        readOnly={readOnly}
        setFreight={setFreight}
        selectedCustomer={selectedCustomer} />
    </FormSection>
  );
}
