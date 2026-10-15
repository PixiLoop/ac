'use client';

import { useEffect, useState } from 'react';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { SearchSelect } from '../../../components/ui/SearchSelect';
import { DatePicker } from '../../../components/ui/DatePicker';
import { CustomerSearchSelect } from '../../../components/common/CustomerSearchSelect';
import { fetchDispatchMethodOptions } from '../../../components/customers/forms/CustomerDispatchForm';
import { api } from '../../../lib/api-client';

const WITH_OTHER_GOODS_CODE = 'W.O.G';

function isWithOtherGoodsMethod(code?: string, label?: string) {
  const normalized = `${code ?? ''} ${label ?? ''}`.toUpperCase().replace(/[^A-Z]/g, '');
  return normalized.includes('WOG') || normalized.includes('WITHOTHERGOODS');
}

export function SalesOrderDetailsForm({ value, update, readOnly = false, selectedCustomer = null }: any) {
  const [dispatchMethodOptions, setDispatchMethodOptions] = useState<{ label: string; value: string }[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);

  useEffect(() => {
    fetchDispatchMethodOptions().then(setDispatchMethodOptions);
  }, []);

  useEffect(() => {
    if (!value.customerId) {
      setDispatches([]);
      return;
    }
    api.get(`/customers/${value.customerId}`)
      .then(res => {
        const customer = res.data?.data ?? res.data;
        const list = customer?.dispatches ?? [];
        setDispatches(list);

        if (!value.dispatchId) {
          const def = list.find((d: any) => d.isDefault);
          if (def) update('dispatchId', def.id);
        }

        if (!value.abnNumber && customer?.abn) {
          update('abnNumber', customer.abn);
        }
      })
      .catch(() => setDispatches([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.customerId]);

  const methodLabel = (code: string) =>
    dispatchMethodOptions.find(o => o.value === code)?.label ?? code;

  useEffect(() => {
    if (!update || value.orderType === 'WITH_OTHER_GOODS') return;

    let newFreight = 0;
    if (value.customerId && value.dispatchMethod) {
      const dispatch = dispatches.find(item => item.method === value.dispatchMethod);
      newFreight = Number(dispatch?.charge || 0);
    }

    if (Number(value.freight) !== newFreight) {
      update('freight', newFreight);
    }
  }, [value.customerId, value.dispatchMethod, value.orderType, dispatches, value.freight, update]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* <SearchSelect
        value={value.customerId}
        onChange={v => update('customerId', v)}
        options={customerOptions}
        placeholder="Customer"
        disabled={readOnly}
      /> */}

      {readOnly ? <Input
        label='Customer'
        disabled
        value={`${value.customerNumber} - ${value.customerName}`}
      /> :
        <CustomerSearchSelect
          value={selectedCustomer}
          onSelect={c => update('customerId', c.id)}
          disabled={readOnly}
          label="Customer"
        />}

      <Select
        label="Order Type"
        value={value.orderType}
        options={[
          { label: 'Standard', value: 'STANDARD' },
          { label: 'Direct to Customer', value: 'DIRECT_TO_CUSTOMER' },
          { label: 'Workshop', value: 'WORKSHOP' },
          { label: 'FM Web', value: 'FM_WEB' },
          { label: 'Special Order', value: 'SPECIAL_ORDER' },
          { label: 'Forward', value: 'FORWARD' },
          { label: 'With Other Goods', value: 'WITH_OTHER_GOODS' },
        ]}
        onChange={v => {
          update('orderType', v);
          if (v !== 'WITH_OTHER_GOODS') return;
          const customerMethod = dispatches.find((d: any) => isWithOtherGoodsMethod(d.method));
          const catalogMethod = dispatchMethodOptions.find(o => isWithOtherGoodsMethod(o.value, o.label));
          update('dispatchMethod', customerMethod?.method ?? catalogMethod?.value ?? WITH_OTHER_GOODS_CODE);
          update('freight', 0);
        }}
        disabled={readOnly}
      />

      <Select
        label="Status"
        value={value.status}
        options={[
          { label: 'Pending', value: 'PENDING' },
          { label: 'In Progress', value: 'IN_PROGRESS' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Cancelled', value: 'CANCELLED' },
        ]}
        onChange={v => update('status', v)}
        disabled={readOnly}
      />

      <DatePicker
        label="Action Date"
        required
        value={value.actionDate}
        onChange={(v) => update('actionDate', v)}
        onlyFuture
        disabled={readOnly}
      />

      <Select
        label="Price Level"
        value={value.priceLevel}
        options={[
          { label: 'Retail', value: 'RETAIL' },
          { label: 'Trade', value: 'TRADE' },
          { label: 'Sales Partner', value: 'SALES_PARTNER' },
          { label: 'Agent', value: 'AGENT' },
        ]}
        onChange={v => update('priceLevel', v)}
        disabled={readOnly}
      />

      <Select
        label="Dispatch Method"
        value={value.dispatchMethod}
        options={(() => {
          const options = dispatches.map((d: any) => ({
            label: `${methodLabel(d.method)}${d.accountName ? ' — ' + d.accountName : d.accountNo ? ' — ' + d.accountNo : ''}`,
            value: d.method,
          }));
          if (value.orderType !== 'WITH_OTHER_GOODS') return options;
          if (options.some((o: { value: string }) => isWithOtherGoodsMethod(o.value))) return options;
          const catalogMethod = dispatchMethodOptions.find(o => isWithOtherGoodsMethod(o.value, o.label));
          return [{ label: catalogMethod?.label ?? 'With Other Goods', value: catalogMethod?.value ?? WITH_OTHER_GOODS_CODE }, ...options];
        })()}
        placeholder="Select Method..."
        onChange={v => update('dispatchMethod', v)}
        disabled={readOnly}
      />

      <Input
        label="Sales Factor"
        numeric
        maxDigits={6}
        value={value.salesFactor}
        onChange={e => update('salesFactor', e.target.value)}
        disabled={readOnly}
      />

      <Select
        label="Payment Terms"
        value={value.paymentTerms}
        options={[
          { label: '14 days', value: 'DAYS_14' },
          { label: '30 days', value: 'DAYS_30' },
          { label: '60 days', value: 'DAYS_60' },
          { label: '90 days', value: 'DAYS_90' },
          { label: 'COD', value: 'COD' },
          { label: 'PAY NOW', value: 'PAY_NOW' },
        ]}
        onChange={v => update('paymentTerms', v)}
        disabled={readOnly}
      />

      <Input
        label="Freight"
        numeric
        maxDigits={6}
        value={value.freight}
        onChange={e => update('freight', e.target.value)}
        disabled={readOnly}
      />

      <Input
        label="Customer PO"
        value={value.customerPO}
        onChange={e => update('customerPO', e.target.value)}
        disabled={readOnly}
      />
    </div>
  );
}
