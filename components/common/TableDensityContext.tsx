'use client';

import React, { createContext, useContext, useState } from 'react';

export type TableDensity = 'comfortable' | 'compact' | 'condensed';

type TableDensityContextType = {
  density: TableDensity;
  setDensity: (d: TableDensity) => void;
};

const TableDensityContext =
  createContext<TableDensityContextType | null>(null);

export function TableDensityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [density, setDensity] =
    useState<TableDensity>('condensed');

  return (
    <TableDensityContext.Provider
      value={{ density, setDensity }}
    >
      {children}
    </TableDensityContext.Provider>
  );
}

export function useTableDensity() {
  const ctx = useContext(TableDensityContext);
  if (!ctx) {
    throw new Error(
      'useTableDensity must be used inside TableDensityProvider',
    );
  }
  return ctx;
}
