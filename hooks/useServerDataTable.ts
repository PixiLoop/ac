import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api-client';

type SortState = {
  key: string | null;
  dir: 'asc' | 'desc' | null;
};

type UseServerDataTableProps = {
  endpoint: string;
  search?: string;
  page: number;
  pageSize: number;
  sort: SortState;
  filters: Record<string, string[]>;
};

export function useServerDataTable<T>({
  endpoint,
  search,
  page,
  pageSize,
  sort,
  filters,
}: UseServerDataTableProps) {
  const [data, setData] = useState<T[]>([]);
  const [rawData, setRawData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const baseKey = useMemo(
    () => JSON.stringify({ search, page, pageSize, sort }),
    [search, page, pageSize, sort]
  );

  // Raw data (for filters)
  useEffect(() => {
    api
      .get(endpoint, {
        params: {
          search: search || undefined,
          skip: (page - 1) * pageSize,
          take: pageSize,
          sortKey: sort.key ?? undefined,
          sortDir: sort.dir ?? undefined,
        },
      })
      .then((res) => {
        const payload = res.data.data ?? res.data;
        setRawData(payload.items ?? []);
      });
  }, [baseKey]);

  // Filtered data (table rows)
  useEffect(() => {
    setLoading(true);
    api
      .get(endpoint, {
        params: {
          search: search || undefined,
          skip: (page - 1) * pageSize,
          take: pageSize,
          sortKey: sort.key ?? undefined,
          sortDir: sort.dir ?? undefined,
          ...Object.fromEntries(
            Object.entries(filters)
              .filter(([, v]) => v.length > 0)
              .map(([k, v]) => [`filter_${k}`, v.join(',')])
          ),
        },
      })
      .then((res) => {
        const payload = res.data.data ?? res.data;
        setData(payload.items ?? []);
        setTotal(payload.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [baseKey, filters]);

  return {
    data,
    rawData,
    total,
    loading,
  };
}
