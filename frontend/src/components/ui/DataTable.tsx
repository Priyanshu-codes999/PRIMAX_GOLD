import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { cn } from "../../utils/format";
import { EmptyState, ErrorState, TableSkeleton } from "./States";
import { IconButton } from "./Button";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  width?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  errorStatus?: number;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFn?: (row: T, query: string) => boolean;
  initialSort?: { key: string; direction: "asc" | "desc" };
  pageSize?: number;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  dense?: boolean;
  maxHeight?: number | string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  errorStatus,
  onRetry,
  searchable = false,
  searchPlaceholder = "Search…",
  searchFn,
  initialSort,
  pageSize = 12,
  onRowClick,
  toolbar,
  emptyTitle = "No records found",
  emptyMessage = "Nothing matches the current filters. Adjust the search or check back once the backend returns data.",
  dense = true,
  maxHeight = 560,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSort?.direction ?? "asc",
  );
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      searchFn ? searchFn(row, needle) : columns.some((column) => {
        const value = column.sortValue?.(row);
        return value !== undefined && value !== null && String(value).toLowerCase().includes(needle);
      }),
    );
  }, [rows, query, searchFn, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const result =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDirection === "asc" ? result : -result;
    });
  }, [filtered, sortKey, sortDirection, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(0);
  };

  return (
    <div className="flex min-h-0 flex-col">
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-2.5 border-b border-ink-700/80 p-3 sm:flex-row sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog-600" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className={cn(
                  "h-8 w-full rounded-md border border-ink-700 bg-ink-900/70 pl-8 pr-3",
                  "text-[12px] text-fog-200 placeholder:text-fog-600",
                  "focus:border-gold-400/40 focus:outline-none focus:ring-2 focus:ring-gold-400/12",
                )}
              />
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="bg-ink-880">
              {columns.map((column) => {
                const active = sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      "whitespace-nowrap border-b border-ink-700 px-3.5 py-2.5",
                      "text-[10px] font-semibold uppercase tracking-[0.12em] text-fog-500",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.headerClassName,
                      column.sortValue && "cursor-pointer select-none hover:text-fog-300",
                    )}
                    onClick={() => column.sortValue && toggleSort(column.key)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {column.header}
                      {active ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-gold-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-gold-400" />
                        )
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <TableSkeleton rows={7} columns={Math.min(columns.length, 6)} />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length}>
                  <ErrorState
                    compact
                    title="Could not load table data"
                    message={error}
                    status={errorStatus}
                    onRetry={onRetry}
                  />
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState compact title={emptyTitle} message={emptyMessage} />
                </td>
              </tr>
            ) : (
              visible.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-ink-800/90 transition-colors",
                    onRowClick && "cursor-pointer",
                    "hover:bg-ink-800/60",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-3.5 text-[12px] text-fog-300",
                        dense ? "py-2.5" : "py-3.5",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                      )}
                    >
                      {column.render(row, currentPage * pageSize + index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex flex-col gap-2 border-t border-ink-700/80 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-fog-500">
            Showing <span className="font-mono text-fog-300">{currentPage * pageSize + 1}</span>–
            <span className="font-mono text-fog-300">
              {Math.min(sorted.length, (currentPage + 1) * pageSize)}
            </span>{" "}
            of <span className="font-mono text-fog-300">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <IconButton label="First page" onClick={() => setPage(0)} disabled={currentPage === 0}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              label="Previous page"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </IconButton>
            <span className="px-2 font-mono text-[11px] text-fog-400">
              {currentPage + 1} / {pageCount}
            </span>
            <IconButton
              label="Next page"
              onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
              disabled={currentPage >= pageCount - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              label="Last page"
              onClick={() => setPage(pageCount - 1)}
              disabled={currentPage >= pageCount - 1}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
