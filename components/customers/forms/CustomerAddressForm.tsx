'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Button } from '../../ui/button';
import { Select } from '../../ui/select';

export function CustomerAddressForm({
  customerId,
  initialData,
  existingAddresses,
  onSaved,
  onClose,
  readOnly = false,
  onSwitchToEdit,
}: {
  customerId: string;
  initialData: any | null;
  existingAddresses: any[];
  onSaved: () => void;
  onClose: () => void;
  readOnly?: boolean;
  onSwitchToEdit?: () => void;
}) {
  const { showToast } = useToast();
  const addressRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  const [form, setForm] = useState({
    id: initialData?.id,
    type: initialData?.type || 'SHIPPING',
    address1: initialData?.address1 || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postcode: initialData?.postcode || '',
    isDefault: initialData?.isDefault || false,
  });

  /* ---------------- Google Autocomplete ---------------- */

  useEffect(() => {
    if (!addressRef.current) return;

    // wait until Google script is available
    const interval = setInterval(() => {
      if (!window.google || autocompleteRef.current) return;

      autocompleteRef.current =
        new window.google.maps.places.Autocomplete(
          addressRef.current!,
          {
            types: ['address'],
            componentRestrictions: { country: 'au' },
          },
        );

      autocompleteRef.current.addListener(
        'place_changed',
        () => {
          const place =
            autocompleteRef.current.getPlace();

          if (!place?.address_components) return;

          const get = (type: string) =>
            place.address_components.find(c =>
              c.types.includes(type),
            )?.long_name || '';

          const street = `${get(
            'street_number',
          )} ${get('route')}`.trim();

          setForm(prev => ({
            ...prev,
            address1: street,
            city: get('locality'),
            state: get(
              'administrative_area_level_1',
            ),
            postcode: get('postal_code'),
          }));
        },
      );

      clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- Save ---------------- */

  const save = async () => {

    if (!form.type) {
      showToast({ type: 'error', title: 'Address Type is required' });
      return;
    }

    if (!form.address1.trim()) {
      showToast({
        type: 'error',
        title: 'Address is required',
      });
      return;
    }

    if (!form.state.trim()) {
      showToast({
        type: 'error',
        title: 'State is required',
      });
      return;
    }
    if (!form.city.trim()) {
      showToast({
        type: 'error',
        title: 'City is required',
      });
      return;
    }

    if (!form.postcode.trim()) {
      showToast({ type: 'error', title: 'Postcode is required' });
      return;
    }

    // normalize default per type
    const updated = existingAddresses
      .filter(a => a.id !== form.id)
      .map(a => ({
        ...a,
        isDefault: false
        // form.isDefault && a.type === form.type  //Commented this for default address issue with type
        //   ? false
        //   : a.isDefault,
      }));

    updated.push(form);

    try {
      await api.patch(
        `/customers/${customerId}/addresses`,
        {
          addresses: updated,
        },
      );

      showToast({
        type: 'success',
        title: 'Address saved',
      });
      onSaved();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message:
          err?.response?.data?.message,
      });
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="mt-4 rounded-md border p-4 space-y-4 bg-slate-50">
      <div className="grid grid-cols-2 gap-4">

        <Select
          placeholder="Address Type"
          label='Address Type'
          value={form.type}
          onChange={(v) => !readOnly && setForm(f => ({ ...f, type: v }))}
          disabled={readOnly}
          options={[
            { label: 'Shipping', value: 'SHIPPING' },
            { label: 'Postal', value: 'POSTAL' },
            { label: 'Statement', value: 'STATEMENT' },
            { label: 'Charge', value: 'CHARGE' },
          ]}
        />


        <Input
          label="Address"
          ref={addressRef}
          value={form.address1}
          placeholder="Start typing address..."
          onChange={e =>
            setForm(f => ({
              ...f,
              address1: e.target.value,
            }))
          }
          readOnly={readOnly}
        />

        <Input
          label="City"
          value={form.city}
          onChange={e =>
            setForm(f => ({
              ...f,
              city: e.target.value,
            }))
          }
          readOnly={readOnly}
        />

        <Input
          label="State"
          value={form.state}
          onChange={e =>
            setForm(f => ({
              ...f,
              state: e.target.value,
            }))
          }
          readOnly={readOnly}
        />

        <Input
          label="Postcode"
          value={form.postcode}
          onChange={e =>
            setForm(f => ({
              ...f,
              postcode: e.target.value,
            }))
          }
          readOnly={readOnly}
        />
      </div>

      <Checkbox
        label="Default Address"
        checked={form.isDefault}
        onChange={v =>
          setForm(f => ({
            ...f,
            isDefault: v,
          }))
        }
        disabled={readOnly}
      />

      <div className="flex justify-end gap-2">
        {readOnly ? (
          <>
            <Button variant="outline" onClick={() => onSwitchToEdit?.()}>Edit</Button>  {/* FIX */}
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </>
        )}
      </div>
    </div>
  );
}
