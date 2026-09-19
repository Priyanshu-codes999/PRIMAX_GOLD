import { useMemo, useState } from "react";
import {
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  Info,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import {
  Panel,
  SectionHeader,
  KeyValueRow,
} from "../components/ui/Layout";

import { Badge, Button } from "../components/ui/Button";

import {
  OrderStatusBadge,
  SideBadge,
  StatusBadge,
} from "../components/ui/Indicators";

import {
  DataTable,
  type Column,
} from "../components/ui/DataTable";

import { DetailDrawer } from "../components/ui/Overlays";

import {
  EmptyState,
  UnavailableState,
} from "../components/ui/States";

import { Select } from "../components/ui/Controls";

import { getOrders } from "../services/backend";
import { previewOrders } from "../services/previewData";

import {
  useRefreshInterval,
  useSourcedResource,
} from "../hooks/useBackend";

import {
  downloadJson,
  formatCurrency,
  formatInteger,
  formatLatency,
  formatNumber,
  formatPrice,
  formatTimestamp,
  timeAgo,
  toNumber,
} from "../utils/format";

import type { Order } from "../types";

function FlowMetric({
  label,
  value,
  subValue,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  tone?: "neutral" | "gain" | "loss" | "gold";
  icon: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-r border-ink-700/70 px-4 py-3.5 last:border-r-0">
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
          tone === "gain"
            ? "border-gain-400/20 bg-gain-400/[0.05] text-gain-400"
            : tone === "loss"
              ? "border-loss-400/20 bg-loss-400/[0.05] text-loss-400"
              : tone === "gold"
                ? "border-gold-400/20 bg-gold-400/[0.05] text-gold-300"
                : "border-ink-700 bg-ink-880 text-fog-500",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-fog-600">
          {label}
        </p>

        <p
          className={[
            "mt-1 truncate font-mono text-[14px] font-medium",
            tone === "gain"
              ? "text-gain-400"
              : tone === "loss"
                ? "text-loss-400"
                : tone === "gold"
                  ? "text-gold-300"
                  : "text-fog-100",
          ].join(" ")}
        >
          {value}
        </p>

        {subValue ? (
          <p className="mt-0.5 truncate text-[8.5px] text-fog-600">
            {subValue}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SideIndicator({
  side,
}: {
  side: "BUY" | "SELL";
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={[
          "flex h-5 w-5 items-center justify-center rounded",
          side === "BUY"
            ? "bg-gain-400/[0.08] text-gain-400"
            : "bg-loss-400/[0.08] text-loss-400",
        ].join(" ")}
      >
        {side === "BUY" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
      </span>

      <SideBadge side={side} />
    </div>
  );
}

export default function Orders() {
  const interval = useRefreshInterval();

  const orders = useSourcedResource(
    () =>
      getOrders().then(
        (result) => result.data,
      ),
    previewOrders,
    {
      intervalMs: interval,
    },
  );

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [sideFilter, setSideFilter] =
    useState("ALL");

  const [symbolFilter, setSymbolFilter] =
    useState("ALL");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [search, setSearch] =
    useState("");

  const rows =
    orders.data?.data ?? [];

  const isPreview =
    orders.data?.source === "preview";

  const symbols = useMemo(
    () =>
      Array.from(
        new Set(
          rows.map(
            (order) => order.symbol,
          ),
        ),
      ).sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((order) => {
        if (
          statusFilter !== "ALL" &&
          order.status !==
            statusFilter
        ) {
          return false;
        }

        if (
          sideFilter !== "ALL" &&
          order.side !== sideFilter
        ) {
          return false;
        }

        if (
          symbolFilter !== "ALL" &&
          order.symbol !==
            symbolFilter
        ) {
          return false;
        }

        if (search.trim()) {
          const query =
            search
              .trim()
              .toLowerCase();

          const haystack = [
            order.id,
            order.symbol,
            order.status,
            order.side,
            order.type,
            order.strategy,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (!haystack.includes(query)) {
            return false;
          }
        }

        return true;
      }),
    [
      rows,
      statusFilter,
      sideFilter,
      symbolFilter,
      search,
    ],
  );

  const stats = useMemo(() => {
    const total = rows.length;

    const filled = rows.filter(
      (order) =>
        order.status === "FILLED",
    ).length;

    const pending = rows.filter(
      (order) =>
        [
          "NEW",
          "PENDING",
          "SUBMITTED",
          "PARTIALLY_FILLED",
        ].includes(order.status),
    ).length;

    const cancelled = rows.filter(
      (order) =>
        [
          "CANCELLED",
          "CANCELED",
        ].includes(order.status),
    ).length;

    const rejected = rows.filter(
      (order) =>
        order.status ===
        "REJECTED",
    ).length;

    const buyOrders = rows.filter(
      (order) =>
        order.side === "BUY",
    ).length;

    const sellOrders = rows.filter(
      (order) =>
        order.side === "SELL",
    ).length;

    const fillRate =
      total > 0
        ? (filled / total) * 100
        : 0;

    const averageLatency =
      rows.length > 0
        ? rows.reduce(
            (sum, order) =>
              sum +
              (toNumber(
                order.latencyNs,
              ) ?? 0),
            0,
          ) / rows.length
        : null;

    return {
      total,
      filled,
      pending,
      cancelled,
      rejected,
      buyOrders,
      sellOrders,
      fillRate,
      averageLatency,
    };
  }, [rows]);

  const columns: Column<Order>[] =
    [
      {
        key: "id",
        header: "Order",
        sortValue: (order) =>
          order.id,
        render: (order) => (
          <div>
            <p className="font-mono text-[10.5px] font-medium text-fog-100">
              {order.id}
            </p>

            {order.strategy ? (
              <p className="mt-0.5 truncate text-[8.5px] text-fog-600">
                {order.strategy}
              </p>
            ) : null}
          </div>
        ),
      },

      {
        key: "symbol",
        header: "Instrument",
        sortValue: (order) =>
          order.symbol,
        render: (order) => (
          <span className="font-mono text-[11px] font-medium text-fog-200">
            {order.symbol}
          </span>
        ),
      },

      {
        key: "side",
        header: "Side",
        sortValue: (order) =>
          order.side,
        render: (order) => (
          <SideIndicator
            side={order.side}
          />
        ),
      },

      {
        key: "type",
        header: "Type",
        sortValue: (order) =>
          order.type,
        render: (order) => (
          <span className="rounded border border-ink-700 bg-ink-880 px-1.5 py-1 text-[8.5px] font-medium uppercase tracking-[0.1em] text-fog-500">
            {order.type}
          </span>
        ),
      },

      {
        key: "price",
        header: "Price",
        align: "right",
        sortValue: (order) =>
          order.price ?? 0,
        render: (order) => (
          <span className="font-mono text-[11px] text-fog-200">
            {formatPrice(
              order.price,
            )}
          </span>
        ),
      },

      {
        key: "quantity",
        header: "Quantity",
        align: "right",
        sortValue: (order) =>
          order.quantity,
        render: (order) => (
          <div className="text-right">
            <p className="font-mono text-[11px] text-fog-200">
              {formatNumber(
                order.quantity,
                0,
              )}
            </p>

            {order.filledQuantity !==
              null &&
            order.filledQuantity !==
              undefined ? (
              <p className="mt-0.5 font-mono text-[8.5px] text-fog-600">
                {formatNumber(
                  order.filledQuantity,
                  0,
                )}{" "}
                filled
              </p>
            ) : null}
          </div>
        ),
      },

      {
        key: "status",
        header: "State",
        sortValue: (order) =>
          order.status,
        render: (order) => (
          <OrderStatusBadge
            status={order.status}
          />
        ),
      },

      {
        key: "timestamp",
        header: "Time",
        align: "right",
        sortValue: (order) =>
          order.timestamp ?? "",
        render: (order) => (
          <div className="text-right">
            <p className="font-mono text-[9.5px] text-fog-300">
              {formatTimestamp(
                order.timestamp,
              )}
            </p>

            <p className="mt-0.5 font-mono text-[8px] text-fog-600">
              {order.timestamp
                ? timeAgo(
                    order.timestamp,
                  )
                : "—"}
            </p>
          </div>
        ),
      },

      {
        key: "actions",
        header: "",
        align: "right",
        render: (order) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setSelectedOrder(
                order,
              )
            }
          >
            Details
          </Button>
        ),
      },
    ];

  return (
    <div className="space-y-4">

      {/* =========================================================
          TERMINAL HEADER
      ========================================================== */}
      <div className="flex flex-col gap-3 border-b border-ink-700/80 pb-3 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gold-300" />

            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-fog-600">
              Execution Terminal
            </span>

            <span className="text-fog-700">
              /
            </span>

            <span className="text-[9px] uppercase tracking-[0.14em] text-fog-500">
              Order Monitor
            </span>
          </div>

          <h1 className="mt-2 text-xl font-semibold tracking-tight text-fog-100">
            Orders
          </h1>

          <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-fog-600">
            Order lifecycle, execution state,
            latency and risk outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            tone={
              isPreview
                ? "warn"
                : "gain"
            }
            size="sm"
          >
            {isPreview
              ? "SIMULATED FLOW"
              : "BACKEND FLOW"}
          </Badge>

          <Button
            icon={
              <Download className="h-3.5 w-3.5" />
            }
            onClick={() =>
              downloadJson(
                "primax-orders.json",
                filtered,
              )
            }
          >
            Export
          </Button>

          <Button
            icon={
              <RefreshCw
                className={
                  orders.loading
                    ? "h-3.5 w-3.5 animate-spin"
                    : "h-3.5 w-3.5"
                }
              />
            }
            onClick={
              orders.refetch
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* =========================================================
          ORDER FLOW METRICS
      ========================================================== */}
      <Panel
        padded={false}
        className="overflow-hidden"
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

          <FlowMetric
            label="Total Orders"
            value={formatInteger(
              stats.total,
            )}
            subValue={`${filtered.length} visible`}
            tone="gold"
            icon={
              <Filter className="h-3.5 w-3.5" />
            }
          />

          <FlowMetric
            label="Filled"
            value={formatInteger(
              stats.filled,
            )}
            subValue={`Fill rate ${stats.fillRate.toFixed(
              1,
            )}%`}
            tone="gain"
            icon={
              <CheckCircle2 className="h-3.5 w-3.5" />
            }
          />

          <FlowMetric
            label="Working"
            value={formatInteger(
              stats.pending,
            )}
            subValue="Open / partial"
            icon={
              <Clock3 className="h-3.5 w-3.5" />
            }
          />

          <FlowMetric
            label="Rejected"
            value={formatInteger(
              stats.rejected,
            )}
            subValue="Risk / validation"
            tone={
              stats.rejected > 0
                ? "loss"
                : "neutral"
            }
            icon={
              <AlertOctagon className="h-3.5 w-3.5" />
            }
          />

          <FlowMetric
            label="Buy / Sell"
            value={`${stats.buyOrders} / ${stats.sellOrders}`}
            subValue="Order direction"
            icon={
              <ArrowDown className="h-3.5 w-3.5" />
            }
          />

          <FlowMetric
            label="Avg Latency"
            value={
              stats.averageLatency !==
              null
                ? formatLatency(
                    stats.averageLatency,
                    "ns",
                  )
                : "—"
            }
            subValue="Acknowledgement"
            icon={
              <Info className="h-3.5 w-3.5" />
            }
          />
        </div>
      </Panel>

      {/* =========================================================
          FILTER / MONITOR BAR
      ========================================================== */}
      <Panel
        padded={false}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-3 px-3.5 py-3 lg:flex-row lg:items-center">

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-fog-600" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search order ID, symbol, strategy..."
              className="h-8 min-w-0 flex-1 bg-transparent text-[10.5px] text-fog-200 outline-none placeholder:text-fog-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              className="w-[140px]"
            >
              <option value="ALL">
                All states
              </option>

              <option value="FILLED">
                Filled
              </option>

              <option value="PENDING">
                Pending
              </option>

              <option value="PARTIALLY_FILLED">
                Partial
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>

              <option value="REJECTED">
                Rejected
              </option>

              <option value="EXPIRED">
                Expired
              </option>
            </Select>

            <Select
              value={sideFilter}
              onChange={(event) =>
                setSideFilter(
                  event.target.value,
                )
              }
              className="w-[110px]"
            >
              <option value="ALL">
                All sides
              </option>

              <option value="BUY">
                Buy
              </option>

              <option value="SELL">
                Sell
              </option>
            </Select>

            <Select
              value={symbolFilter}
              onChange={(event) =>
                setSymbolFilter(
                  event.target.value,
                )
              }
              className="w-[130px]"
            >
              <option value="ALL">
                All symbols
              </option>

              {symbols.map(
                (symbol) => (
                  <option
                    key={symbol}
                    value={symbol}
                  >
                    {symbol}
                  </option>
                ),
              )}
            </Select>
          </div>
        </div>
      </Panel>

      {/* =========================================================
          ORDER MONITOR
      ========================================================== */}
      <Panel
        padded={false}
        className="overflow-hidden"
      >
        <div className="border-b border-ink-700/70 px-4 py-3">
          <SectionHeader
            title="Order Monitor"
            subtitle="Click an order to inspect its lifecycle and execution metadata."
            actions={
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-fog-600">
                  {filtered.length} /{" "}
                  {rows.length}
                </span>

                <Badge
                  tone={
                    isPreview
                      ? "warn"
                      : "neutral"
                  }
                  size="sm"
                >
                  {isPreview
                    ? "PREVIEW"
                    : "API"}
                </Badge>
              </div>
            }
          />
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(order) =>
            order.id
          }
          loading={
            orders.loading
          }
          error={
            orders.status ===
            "error"
              ? orders.error
              : null
          }
          onRetry={
            orders.refetch
          }
          searchable={false}
          initialSort={{
            key: "timestamp",
            direction: "desc",
          }}
          pageSize={12}
          onRowClick={
            setSelectedOrder
          }
          emptyTitle="No orders"
          emptyMessage="No orders match the current filters."
        />
      </Panel>

      {/* =========================================================
          ORDER SUBMISSION STATE
      ========================================================== */}
      <Panel
        padded={false}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-fog-300">
              Order Entry
            </p>

            <p className="mt-1 text-[9.5px] text-fog-600">
              Write access is controlled by the
              backend trading contract.
            </p>
          </div>

          <Button
            variant="primary"
            disabled
            title="No POST /api/orders endpoint is currently available"
          >
            Place Order
          </Button>
        </div>

        <div className="border-t border-ink-800 px-4 py-3">
          <UnavailableState
            title="Order submission is not connected"
            message="The current FastAPI contract exposes GET /api/orders only. The interface stays disabled instead of simulating an order or pretending a trade was submitted."
          />
        </div>
      </Panel>

      {/* =========================================================
          DETAIL DRAWER
      ========================================================== */}
      <DetailDrawer
        open={
          selectedOrder !== null
        }
        onClose={() =>
          setSelectedOrder(null)
        }
        title={
          selectedOrder
            ? `Order ${selectedOrder.id}`
            : ""
        }
        subtitle={
          selectedOrder
            ? `${selectedOrder.symbol} · ${selectedOrder.side} · ${selectedOrder.type}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setSelectedOrder(
                  null,
                )
              }
            >
              Close
            </Button>

            <Button
              variant="primary"
              disabled
            >
              Modify Order
            </Button>
          </>
        }
      >
        {selectedOrder && (
          <div className="space-y-4">

            {/* State */}
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge
                status={
                  selectedOrder.status
                }
              />

              <SideBadge
                side={
                  selectedOrder.side
                }
                size="md"
              />

              <Badge
                tone="neutral"
                size="sm"
              >
                {selectedOrder.type}
              </Badge>
            </div>

            {/* Order identity */}
            <div className="rounded-lg border border-ink-700 bg-ink-880 px-3.5 py-3">
              <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-fog-600">
                Instrument
              </p>

              <p className="mt-1 font-mono text-lg font-semibold text-fog-100">
                {selectedOrder.symbol}
              </p>

              <p className="mt-1 font-mono text-[9px] text-fog-600">
                {selectedOrder.id}
              </p>
            </div>

            {/* Details */}
            <div className="panel-flat divide-y divide-ink-700/70 px-3">
              <KeyValueRow
                label="Order ID"
                value={
                  selectedOrder.id
                }
              />

              <KeyValueRow
                label="Symbol"
                value={
                  selectedOrder.symbol
                }
              />

              <KeyValueRow
                label="Side"
                value={
                  selectedOrder.side
                }
              />

              <KeyValueRow
                label="Order type"
                value={
                  selectedOrder.type
                }
              />

              <KeyValueRow
                label="Price"
                value={formatPrice(
                  selectedOrder.price,
                )}
              />

              <KeyValueRow
                label="Quantity"
                value={formatNumber(
                  selectedOrder.quantity,
                  2,
                )}
              />

              <KeyValueRow
                label="Filled"
                value={formatNumber(
                  selectedOrder.filledQuantity,
                  2,
                )}
              />

              <KeyValueRow
                label="Notional"
                value={formatCurrency(
                  (toNumber(
                    selectedOrder.price,
                  ) ?? 0) *
                    (toNumber(
                      selectedOrder.quantity,
                    ) ?? 0),
                  2,
                )}
              />

              <KeyValueRow
                label="Latency"
                value={formatLatency(
                  selectedOrder.latencyNs,
                  "ns",
                )}
              />

              <KeyValueRow
                label="Created"
                value={formatTimestamp(
                  selectedOrder.timestamp,
                  "full",
                )}
              />

              <KeyValueRow
                label="Updated"
                value={formatTimestamp(
                  selectedOrder.updatedAt,
                  "full",
                )}
              />

              <KeyValueRow
                label="Strategy"
                value={
                  selectedOrder.strategy ??
                  "—"
                }
              />
            </div>

            {/* Rejection */}
            {selectedOrder.rejectReason ? (
              <div className="rounded-lg border border-loss-500/25 bg-loss-500/[0.06] px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-loss-400" />

                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-loss-400">
                    Rejection Reason
                  </p>
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-fog-300">
                  {
                    selectedOrder.rejectReason
                  }
                </p>
              </div>
            ) : null}

            {/* Source */}
            <div className="rounded-lg border border-ink-700 bg-ink-880 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fog-600" />

                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={
                        isPreview
                          ? "SIMULATED"
                          : "BACKEND"
                      }
                      size="sm"
                    />
                  </div>

                  <p className="mt-2 text-[10px] leading-relaxed text-fog-500">
                    {isPreview
                      ? "This record belongs to the deterministic preview dataset and does not represent a real executed order."
                      : "This order record was loaded directly from the backend order service."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}