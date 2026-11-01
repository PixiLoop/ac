'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api-client';
import { Input } from '../ui/input';
import ConfirmModal from '../ui/ConfirmModal';

export const INVALID_CUSTOMER_NUMBER = 'Invalid Customer Number';
export const NOT_AN_FM_CUSTOMER = 'Not an FM Customer';

type Customer = {
    id: string;
    customerNumber: string;
    name: string;
    registeredName?: string;
    address1?: string;
    address2?: string;
    abn: string;
    fmCustomer?: {
        id: string;
        fleetName?: string | null;
        fmWebNumber?: string | null;
    } | null;
};

type Props = {
    /** The currently-selected customer object (or null) */
    value: Customer | null;
    /** Called with the full customer object when the user picks one */
    onSelect: (customer: Customer) => void;
    disabled?: boolean;
    /** Defaults to "Customer" */
    label?: string;
    /** FM screens reject an account that has no FM customer record */
    requireFmCustomer?: boolean;
};

export function CustomerSearchSelect({
    value,
    onSelect,
    disabled,
    label = 'Customer',
    requireFmCustomer = false,
}: Props) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const [notice, setNotice] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /* ── search the full customer list, including FM fleet names ── */
    useEffect(() => {
        const t = setTimeout(() => {
            api.get('/customers', {
                params: {
                    search: query.trim() || undefined,
                    take: 50,
                    sortKey: 'name',
                    sortDir: 'asc',
                },
            }).then(res => {
                const data =
                    res.data?.data?.data ||
                    res.data?.data ||
                    res.data;
                setCustomers(Array.isArray(data) ? data : []);
            });
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    /* ── close on outside click ── */
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    /* ── filter ── */
    const filtered = customers.filter(c => {
        const q = query.toLowerCase();
        if (!q) return true;
        return (
            c.customerNumber?.toLowerCase().includes(q) ||
            c.name?.toLowerCase().includes(q) ||
            c.registeredName?.toLowerCase().includes(q) ||
            c.fmCustomer?.fleetName?.toLowerCase().includes(q) ||
            c.fmCustomer?.fmWebNumber?.toLowerCase().includes(q)
        );
    });

    const optionLabel = (c: Customer) => {
        const fleet = c.fmCustomer?.fleetName?.trim();
        if (fleet && fleet.toLowerCase() !== c.name?.toLowerCase()) {
            return `${c.name} (${fleet})`;
        }
        return c.name;
    };

    useEffect(() => setHighlighted(0), [query]);

    const reject = (message: string) => {
        setNotice(message);
        setOpen(true);
    };

    const accept = (customer: Customer) => {
        if (requireFmCustomer && !customer.fmCustomer) {
            reject(NOT_AN_FM_CUSTOMER);
            return;
        }
        onSelect(customer);
        setOpen(false);
        setQuery('');
    };

    const resolveEnteredNumber = async () => {
        const term = query.trim();
        const exact = filtered.find(
            c => c.customerNumber?.toLowerCase() === term.toLowerCase(),
        );
        if (exact) {
            accept(exact);
            return;
        }

        if (!term) {
            const selected = filtered[highlighted];
            if (selected) accept(selected);
            return;
        }

        try {
            const res = await api.get('/customers/lookup', { params: { number: term } });
            const customer = res.data?.data ?? res.data;
            if (customer?.id) {
                accept(customer);
                return;
            }
        } catch {
            /* unrecognised number */
        }

        if (filtered.length > 0 && !/^\d[\d\s-]*$/.test(term)) {
            accept(filtered[highlighted]);
            return;
        }

        reject(INVALID_CUSTOMER_NUMBER);
    };

    const displayLabel = value
        //? `${value.customerNumber} – ${value.registeredName || value.name}`
        ? `${value.customerNumber} – ${optionLabel(value)}`
        : '';

    /* ── READ-ONLY ── */
    if (disabled) {
        return (
            <div className="w-full min-w-0">
                <label className="font-medium text-slate-700 mb-1 block text-sm">
                    {label}
                </label>
                <div className="w-full h-9 border rounded-md px-3 flex items-center text-sm bg-slate-50 text-slate-700 truncate">
                    {displayLabel || '-'}
                </div>
            </div>
        );
    }

    return (
        <>
            <ConfirmModal
                open={!!notice}
                title=""
                message={notice ?? ''}
                confirmText="OK"
                alertOnly
                danger={false}
                onConfirm={() => {
                    setNotice(null);
                    setOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}
                onCancel={() => {
                    setNotice(null);
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}
            />
            <div ref={ref} className="relative w-full min-w-0">
                <label className="font-medium text-slate-700 mb-1 block text-sm">
                    {label}
                </label>

                {/* trigger */}
                <div
                    className={cn(
                        'w-full h-9 border rounded-md px-3 flex items-center text-sm bg-white cursor-pointer truncate',
                        !value && 'text-slate-400',
                    )}
                    onClick={() => setOpen(o => !o)}
                >
                    {displayLabel || `Select ${label}`}
                </div>

                {/* dropdown */}
                {open && (
                    <div className="absolute z-50 mt-1 w-full border rounded-md bg-white shadow-lg">
                        <input
                            ref={inputRef}
                            autoFocus
                            className="w-full px-3 py-2 text-sm border-b outline-none"
                            placeholder="Type to search…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setHighlighted(h => Math.min(h + 1, filtered.length - 1));
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setHighlighted(h => Math.max(h - 1, 0));
                                }
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void resolveEnteredNumber();
                                }
                                if (e.key === 'Escape') setOpen(false);
                            }}
                        />

                        <div className="max-h-56 overflow-auto">
                            {filtered.length === 0 && (
                                <div className="px-3 py-2 text-sm text-slate-500">No results</div>
                            )}
                            {filtered.map((c, idx) => (
                                <div
                                    key={c.id}
                                    className={cn(
                                        'px-3 py-2 text-sm cursor-pointer',
                                        idx === highlighted && 'bg-slate-100',
                                    )}
                                    onMouseEnter={() => setHighlighted(idx)}
                                    onClick={() => accept(c)}
                                >
                                    <span className="font-mono text-xs text-slate-500 mr-2">
                                        {c.customerNumber}
                                    </span>
                                    {optionLabel(c)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <Input
                label="ABN"
                numeric
                value={customers.find(customer => customer.id === value?.id)?.abn ?? value?.abn ?? ""}
                // onChange={e => update('salesFactor', e.target.value)}
                readOnly
            />
        </>
    );
}