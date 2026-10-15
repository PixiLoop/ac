import { useState } from 'react';

export function useFormValidation<T extends string>() {
  const [errors, setErrors] =
    useState<Partial<Record<T, string>>>({});

  const invalidate = (
    map: Partial<Record<T, string>>,
  ): string | null => {
    setErrors(map);

    const values = Object.values(map) as string[];
    const firstError = values.find(v => v);

    return firstError ?? null;
  };

  const clear = (field: T) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const has = (field: T) => Boolean(errors[field]);

  return {
    invalidate,
    clear,
    has,
  };
}
