'use client';

import * as React from "react";
import { ArrowUpDown, ChevronDown, Search } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import type { ItemStatus, Supplier, SupplierOrder, StockReceipt, SortKey, SortDirection } from "./types";

// ── Primitive UI components ──────────────────────────────────────────────────

export function Badge({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[11px]", variant === "secondary" ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white border-slate-200 text-slate-700", className)}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded border bg-white", className)}>{children}</div>;
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("border-b px-4 py-3", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-sm font-semibold text-slate-900", className)}>{children}</h2>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

export function Checkbox({ checked = false, onCheckedChange }: { checked?: boolean; onCheckedChange?: () => void }) {
  return <input type="checkbox" checked={checked} onChange={() => onCheckedChange?.()} className="h-3.5 w-3.5 rounded border-slate-300" />;
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-collapse text-[11px]">{children}</table>;
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

// export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
//   return <tr className={cn("border-b border-slate-100", className)}>{children}</tr>;
// }

// export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
//   return <th className={cn("px-2 py-2 text-left font-medium text-slate-600", className)}>{children}</th>;
// }

export function TableRow({ children, className, onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn("border-b border-slate-100", className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className }: {
  children?: React.ReactNode;  // ← ? add చేశాం
  className?: string;
}) {
  return (
    <th className={cn("px-2 py-2 text-left font-medium text-slate-600", className)}>
      {children}
    </th>
  );
}



export function TableCell({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td className={cn("px-2 py-2 align-top", className)} colSpan={colSpan}>{children}</td>;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

export const TabsContext = React.createContext<{ value: string; setValue: (v: string) => void } | null>(null);

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-1", className)}>{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={cn("rounded border px-2 py-1 text-[11px]", active ? "bg-white text-slate-900 border-slate-300" : "bg-slate-100 text-slate-700 border-slate-200")}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}

// ── Popover ───────────────────────────────────────────────────────────────────

export function Popover({ children }: { children: React.ReactNode }) {
  return <div className="inline-block">{children}</div>;
}

export function PopoverTrigger({ children }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

export function PopoverContent({ children, className }: { children: React.ReactNode; className?: string; align?: string }) {
  return <div className={cn("mt-1 rounded border bg-white p-2 shadow-sm", className)}>{children}</div>;
}

// ── Filter components ─────────────────────────────────────────────────────────

type MultiSelectFilterProps = {
  label: string;
  values: string[];
  selected: string[];
  onChange: (next: string[]) => void;
};

export function MultiSelectFilter({ label, values, selected, onChange }: MultiSelectFilterProps) {
  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-3.5 w-3.5" />
          {selected.length > 0 ? (
            <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
              {selected.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">Select one or more values</p>
        </div>
        <div className="max-h-60 space-y-2 overflow-auto">
          {values.map((value) => (
            <label key={value} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
              <Checkbox checked={selected.includes(value)} onCheckedChange={() => toggleValue(value)} />
              <span className="text-sm">{value}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type HeaderTextFilterProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function HeaderTextFilter({ label, value, onChange }: HeaderTextFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground">
          <Search className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-2" align="start">
        <p className="text-sm font-medium">Filter {label}</p>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} />
      </PopoverContent>
    </Popover>
  );
}

type HeaderSortButtonProps = {
  column: SortKey;
  activeSort: SortKey;
  direction: SortDirection;
  onSort: (column: SortKey) => void;
};

export function HeaderSortButton({ column, activeSort, direction, onSort }: HeaderSortButtonProps) {
  const isActive = activeSort === column;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 px-2 ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      onClick={() => onSort(column)}
    >
      <ArrowUpDown className="h-3.5 w-3.5" />
      {isActive ? <span className="ml-1 text-[10px] uppercase">{direction}</span> : null}
    </Button>
  );
}

// ── Status badge components ───────────────────────────────────────────────────

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const cls =
    status === "Valid Item"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FM Service"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "Airco Kit"
          ? "border-orange-200 bg-orange-50 text-orange-700"
          : "border-slate-200 bg-slate-100 text-slate-700";
  return <Badge variant="outline" className={cls}>{status}</Badge>;
}

export function SupplierStatusBadge({ status }: { status: Supplier["status"] }) {
  return (
    <Badge
      variant="outline"
      className={status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}
    >
      {status}
    </Badge>
  );
}

export function SupplierOrderStatusBadge({ status }: { status: SupplierOrder["status"] }) {
  const className =
    status === "Draft"
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : status === "Ordered"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : status === "Part Received"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : status === "Received"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-100 text-slate-700";
  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  );
}

export function StockReceiptStatusBadge({ status }: { status: StockReceipt["status"] }) {
  return (
    <Badge
      variant="outline"
      className={status === "Posted" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}
    >
      {status}
    </Badge>
  );
}
