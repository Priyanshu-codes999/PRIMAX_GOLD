#pragma once

#include "exchange_simulator.hpp"
#include "execution.hpp"
#include "features.hpp"
#include "market_data.hpp"
#include "ml_strategy.hpp"
#include "oms.hpp"
#include "order_book.hpp"
#include "performance.hpp"
#include "portfolio.hpp"
#include "risk_manager.hpp"
#include "strategy.hpp"
#include "strategy_v2.hpp"
#include "trade_ledger.hpp"
#include "database.hpp"

#include <cstdint>
#include <deque>
#include <vector>

namespace hft {

struct BacktestResult {
    std::uint64_t totalTicks;
    std::uint64_t totalOrders;
    std::uint64_t filledOrders;
    std::uint64_t rejectedOrders;
    std::uint64_t expiredOrders;
    std::uint64_t partialFills;
    std::uint64_t delayedFillAttempts;

    std::int64_t finalPosition;

    double initialCash;
    double finalCash;

    double realizedPnL;
    double unrealizedPnL;
    double totalPnL;
    double equityPnL;
    double pnlReconciliationError;

    double feesPaid;
    double turnover;

    double winRate;

    std::uint64_t buySignals;
    std::uint64_t sellSignals;
    std::uint64_t holdSignals;

    double averageSignalConfidence;

    std::vector<double> equityCurve;
    std::vector<double> tradePnLs;
};

class BacktestEngine {
public:
    BacktestEngine(
        MarketDataSimulator& marketData,
        OrderBook& orderBook,
        OrderBookImbalanceStrategy& strategy,
        MultiSignalStrategy& advancedStrategy,
        RiskManager& riskManager,
        OrderManagementSystem& oms,
        ExecutionEngine& executionEngine,
        Portfolio& portfolio,
        TradeLedger& tradeLedger,
        MLStrategy& mlStrategy,
        DatabaseManager* database = nullptr
    );

    BacktestResult run(std::uint64_t ticks);

private:
    struct PendingOrder {
        Order order;
        std::uint64_t submissionTick;
        std::uint64_t executionTick;
        std::uint64_t expiryTick;
    };

    MarketDataSimulator& marketData_;
    OrderBook& orderBook_;

    // Legacy strategy retained for compatibility.
    OrderBookImbalanceStrategy& strategy_;

    // Active multi-signal strategy.
    MultiSignalStrategy& advancedStrategy_;
    MLStrategy& mlStrategy_;

    FeatureEngine featureEngine_;

    RiskManager& riskManager_;
    OrderManagementSystem& oms_;
    ExecutionEngine& executionEngine_;
    Portfolio& portfolio_;
    TradeLedger& tradeLedger_;

    DatabaseManager* database_;

    std::deque<PendingOrder> pendingOrders_;
};

} // namespace hft
