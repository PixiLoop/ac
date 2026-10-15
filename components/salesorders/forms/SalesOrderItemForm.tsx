'use client';

import { Button } from '../../../components/ui/button';

export function SalesOrderItemForm({ onAddItem }: any) {
  return (
    <Button type="button" size="sm" onClick={onAddItem}>
      Add Item
    </Button>
  );
}
