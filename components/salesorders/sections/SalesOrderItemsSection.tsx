import { FormSection } from '../../../components/forms/FormSection';
import { Button } from '../../../components/ui/button';
import { SalesOrderItemsTable } from '../tables/SalesOrderItemsTable';
import { SalesOrderTotals } from '../SalesOrderTotals';

export function SalesOrderItemsSection({
  items,
  setItems,
  freight,
  disabled,
  defaultOpen = false,
  category,
  showBackorderQty = true,
  lockedReduceOnly = false,
  form
}: any) {
  //canonical empty row (matches table expectations)
  const EMPTY_ITEM = {
    itemId: '',
    partNo: '',
    description: '',
    availableQty: null,
    qty: 1,
    unitPrice: 0,
    discountPct: 0,
  };
  const realItems = items.filter(i => i.itemId);

  // pad to minimum 5 rows (UI only)
  // const paddedItems =
  //   items.length >= 5
  //     ? items
  //     : [
  //         ...items,
  //         ...Array.from({ length: 5 - items.length }, () => ({
  //           ...EMPTY_ITEM,
  //         })),
  //       ];
  // console.log("disabled=", disabled)
  // const paddedItems =
  //   realItems.length === 0
  //     ? Array.from({ length: 5 }, () => ({ ...EMPTY_ITEM }))
  //     : items;
  // const paddedItems =
  // !disabled && items.length === 0
  //   ? Array.from({ length: 5 }, () => ({ ...EMPTY_ITEM }))
  //   : items;

  const addItem = () => {
    setItems([...items, { ...EMPTY_ITEM }]);
  };

  return (
    <FormSection
      title="Item Entry"
      defaultOpen={defaultOpen}
      rightAction={
        (!disabled && form.invoiceType !== "SALESORDER") && (
          <Button
            size="sm"
            type="button"
            onClick={addItem}
          >
            Add Item
          </Button>
        )
      }
    >
      <div className="overflow-visible">
      <SalesOrderItemsTable
        items={items}
        setItems={setItems}
        form={form}
        mode={disabled ? 'view' : 'edit'}
        category={category}
        showBackorderQty={showBackorderQty}
        lockedReduceOnly={lockedReduceOnly}
      />
      </div>
      {/* <SalesOrderTotals items={items} freight={freight} /> */}
    </FormSection>
  );
}
