import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

const s = {
  wrapper: {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f0f0f0',
    overflow: 'hidden' as const,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  searchWrap: {
    position: 'relative' as const,
    width: 300,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#adb5bd',
  },
  searchInput: {
    width: '100%',
    padding: '9px 12px 9px 38px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#1a1a2e',
    background: '#f8f9fa',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    padding: '12px 16px',
    fontSize: 12,
    fontWeight: 600 as const,
    color: '#6c757d',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '1px solid #f0f0f0',
    background: '#f8f9fa',
    cursor: 'default',
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
  },
  thSortable: {
    cursor: 'pointer',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#1a1a2e',
    borderBottom: '1px solid #f5f5f5',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    maxWidth: 220,
  },
  trHover: {
    background: '#f8fafd',
  },
  paginationWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid #f0f0f0',
    fontSize: 13,
    color: '#6c757d',
  },
  pageBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s',
    color: '#1a1a2e',
    fontSize: 13,
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  pageBtnActive: {
    background: '#1B3A5C',
    color: '#ffffff',
    borderColor: '#1B3A5C',
  },
  empty: {
    padding: 48,
    textAlign: 'center' as const,
    color: '#adb5bd',
    fontSize: 14,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Rechercher...',
  onRowClick,
  emptyMessage = 'Aucune donnee trouvee',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const v = row[col.key];
        return v !== undefined && v !== null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  // Reset page on search
  React.useEffect(() => { setPage(0); }, [search]);

  return (
    <div style={s.wrapper}>
      {/* Toolbar */}
      {searchable && (
        <div style={s.toolbar}>
          <div style={s.searchWrap}>
            <Search size={16} style={s.searchIcon} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={s.searchInput}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2E86DE'; e.currentTarget.style.background = '#fff'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8f9fa'; }}
            />
          </div>
          <span style={{ fontSize: 13, color: '#6c757d' }}>
            {filtered.length} resultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...s.th,
                    ...(col.sortable ? s.thSortable : {}),
                    width: col.width,
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={s.empty}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr
                  key={idx}
                  style={hoveredRow === idx ? s.trHover : undefined}
                  onMouseEnter={() => setHoveredRow(idx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onRowClick?.(row)}
                  role={onRowClick ? 'button' : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ ...s.td, cursor: onRowClick ? 'pointer' : 'default' }}>
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode) ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > pageSize && (
        <div style={s.paginationWrap}>
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} sur{' '}
            {sorted.length}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              style={{ ...s.pageBtn, ...(page === 0 ? s.pageBtnDisabled : {}) }}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5));
              const pageNum = start + i;
              if (pageNum >= totalPages) return null;
              return (
                <button
                  key={pageNum}
                  style={{ ...s.pageBtn, ...(page === pageNum ? s.pageBtnActive : {}) }}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              style={{ ...s.pageBtn, ...(page >= totalPages - 1 ? s.pageBtnDisabled : {}) }}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
