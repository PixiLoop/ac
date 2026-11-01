import { FormSection } from '../../forms/FormSection';
import { Button } from '../../../components/ui/button';
import { FMPreinstallItemsTable } from '../tables/FMPreinstallItemsTable';

export function FMPreinstallItemsSection({
  items,
  setItems,
  onSelectItem,
  activeItemIndex,
}: any) {
  const addRow = () => {
    const last = items[items.length - 1];
    if (last && !last.productId) return;
    setItems([
      ...items,
      {
        productId: '',
        quantity: 1,
        unitPrice: 0,
        discountPct: 0,
        lineTotal: 0,
        installDetail: {},
      },
    ]);
  };

  return (
    <FormSection
      title="Item Entry"
      defaultOpen
      rightAction={
        <Button size="sm" type="button" onClick={addRow}>
          Add Item
        </Button>
      }
    >
      <div className="overflow-visible">
        <FMPreinstallItemsTable
          items={items}
          setItems={setItems}
          onSelectItem={onSelectItem}
          activeItemIndex={activeItemIndex}
        />
      </div>
    </FormSection>
  );
}