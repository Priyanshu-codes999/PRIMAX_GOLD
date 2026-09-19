#include "backtest.hpp"

#include <algorithm>
#include <cstdint>

namespace hft {

BacktestEngine::BacktestEngine(
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
    DatabaseManager* database
)
    : marketData_(marketData),
      orderBook_(orderBook),
      strategy_(strategy),
      advancedStrategy_(advancedStrategy),
      mlStrategy_(mlStrategy),
      riskManager_(riskManager),
      oms_(oms),
      executionEngine_(executionEngine),
      portfolio_(portfolio),
      tradeLedger_(tradeLedger),
      database_(database) {
}

BacktestResult BacktestEngine::run(
    std::uint64_t ticks
) {
    std::uint64_t totalOrders = 0;
    std::uint64_t filledOrders = 0;
    std::uint64_t rejectedOrders = 0;
    std::uint64_t expiredOrders = 0;
    std::uint64_t partialFills = 0;
    std::uint64_t delayedFillAttempts = 0;

    double turnover = 0.0;

    std::uint64_t winningTrades = 0;

    std::uint64_t buySignals = 0;
    std::uint64_t sellSignals = 0;
    std::uint64_t holdSignals = 0;

    double totalSignalConfidence = 0.0;
    std::uint64_t signalCount = 0;

    std::uint64_t nextOrderId = 100000;

    constexpr std::uint64_t ORDER_EXPIRY_TICKS = 2;

    double entryPrice = 0.0;
    std::uint64_t entryTimestampNs = 0;
    std::uint64_t entryQuantity = 0;

    BacktestResult result{};

    result.initialCash = portfolio_.cash();

    result.equityCurve.reserve(ticks + 1);
    result.tradePnLs.reserve(ticks);

    pendingOrders_.clear();

    for (std::uint64_t i = 0; i < ticks; ++i) {

        const MarketTick tick =
            marketData_.nextTick();

        if (database_ != nullptr) {
            database_->insertMarketTick(tick);
        }

        orderBook_.updateFromMarketData(tick);

        portfolio_.markToMarket(
            tick.bid_price
        );

        /*
         * --------------------------------------------------------
         * 1. EXECUTE ORDERS SUBMITTED ON THE PREVIOUS TICK
         * --------------------------------------------------------
         */
        while (!pendingOrders_.empty() &&
               pendingOrders_.front().executionTick <= i) {

            PendingOrder pending =
                pendingOrders_.front();

            pendingOrders_.pop_front();

            const Order& order =
                pending.order;

            /*
             * Cancel stale orders instead of allowing them
             * to remain active indefinitely.
             */
            if (i > pending.expiryTick) {
                oms_.cancelOrder(order.id);
                continue;
            }

            /*
             * The order is executed against the CURRENT market,
             * not the market that existed when the signal was
             * generated.
             */
            ++delayedFillAttempts;

            const ExecutionResult execution =
                executionEngine_.executeOrder(
                    order,
                    tick
                );

            if (!execution.filled) {

                /*
                 * The order remains active until its expiry tick.
                 * Reinsert it so the next market tick can attempt
                 * execution again.
                 */
                if (i < pending.expiryTick) {

                    pending.executionTick = i + 1;

                    pendingOrders_.push_back(
                        pending
                    );

                } else {

                    oms_.cancelOrder(order.id);
                }

                continue;
            }

            ++filledOrders;

            if (database_ != nullptr) {
                database_->insertExecution(
                    order.id,
                    tick.symbol,
                    order.side == OrderSide::BUY ? "BUY" : "SELL",
                    execution.executionPrice,
                    execution.filledQuantity,
                    execution.fee,
                    execution.latencyNs
                );
            }

            /*
             * Handle partial fills correctly.
             *
             * If the exchange fills only part of the order,
             * keep the remaining quantity active until expiry.
             */
            if (execution.filledQuantity < order.quantity) {

                ++partialFills;

                const std::uint64_t remainingQuantity =
                    order.quantity -
                    execution.filledQuantity;

                Order remainingOrder(
                    order.id,
                    order.side,
                    order.type,
                    order.price,
                    remainingQuantity
                );

                if (i < pending.expiryTick) {

                    pending.order = remainingOrder;
                    pending.executionTick = i + 1;

                    pendingOrders_.push_back(
                        pending
                    );
                }
            }

            turnover +=
                execution.executionPrice *
                static_cast<double>(
                    execution.filledQuantity
                );

            oms_.fillOrder(
                order.id,
                execution.filledQuantity
            );

            const std::int64_t positionBefore =
                portfolio_.position();

            const double realizedBefore =
                portfolio_.realizedPnL();

            std::uint64_t closedQuantity = 0;

            if (positionBefore > 0 &&
                order.side == OrderSide::SELL) {

                closedQuantity =
                    std::min<std::uint64_t>(
                        execution.filledQuantity,
                        static_cast<std::uint64_t>(
                            positionBefore
                        )
                    );

            } else if (positionBefore < 0 &&
                       order.side == OrderSide::BUY) {

                closedQuantity =
                    std::min<std::uint64_t>(
                        execution.filledQuantity,
                        static_cast<std::uint64_t>(
                            -positionBefore
                        )
                    );
            }

            /*
             * New position starts here.
             *
             * IMPORTANT:
             * Entry timestamp is the execution timestamp,
             * not the signal timestamp.
             */
            if (positionBefore == 0) {

                entryPrice =
                    execution.executionPrice;

                entryTimestampNs =
                    tick.timestamp_ns;

                entryQuantity =
                    execution.filledQuantity;
            }

            portfolio_.processFill(
                order,
                execution.executionPrice,
                execution.filledQuantity,
                execution.fee
            );

            portfolio_.markToMarket(
                tick.bid_price
            );

            if (database_ != nullptr) {
                database_->upsertPosition(
                    tick.symbol,
                    portfolio_.position(),
                    portfolio_.averageEntryPrice(),
                    portfolio_.realizedPnL()
                );

                database_->insertPortfolioSnapshot(
                    portfolio_.cash(),
                    portfolio_.position(),
                    tick.bid_price,
                    portfolio_.realizedPnL(),
                    portfolio_.unrealizedPnL(),
                    portfolio_.feesPaid(),
                    portfolio_.totalPnL()
                );
            }

            const double realizedAfter =
                portfolio_.realizedPnL();

            const double closedTradePnL =
                realizedAfter - realizedBefore;

            /*
             * Record completed round-trip trade.
             */
            if (closedQuantity > 0) {

                TradeRecord trade{
                    static_cast<std::uint64_t>(
                        tradeLedger_.size() + 1
                    ),

                    positionBefore > 0
                        ? OrderSide::BUY
                        : OrderSide::SELL,

                    entryPrice,
                    execution.executionPrice,
                    closedQuantity,
                    closedTradePnL,
                    entryTimestampNs,
                    tick.timestamp_ns
                };

                tradeLedger_.recordTrade(trade);

                result.tradePnLs.push_back(
                    closedTradePnL
                );

                if (closedTradePnL > 0.0) {
                    ++winningTrades;
                }

                /*
                 * If the order reverses the position,
                 * remaining quantity becomes the new entry.
                 */
                const std::int64_t positionAfter =
                    portfolio_.position();

                if (positionAfter != 0) {

                    entryPrice =
                        execution.executionPrice;

                    entryTimestampNs =
                        tick.timestamp_ns;

                    entryQuantity =
                        execution.filledQuantity -
                        closedQuantity;

                } else {

                    entryPrice = 0.0;
                    entryTimestampNs = 0;
                    entryQuantity = 0;
                }
            }
        }

        /*
         * Record current account equity AFTER processing
         * delayed executions.
         */
        const double equity =
            portfolio_.cash() +
            static_cast<double>(
                portfolio_.position()
            ) * tick.bid_price;

        result.equityCurve.push_back(equity);

        /*
         * --------------------------------------------------------
         * 2. GENERATE NEW SIGNAL
         * --------------------------------------------------------
         */
        const MarketFeatures features =
            featureEngine_.calculate(
                orderBook_,
                tick
            );

        const MLPrediction mlPrediction =
            mlStrategy_.decide(features);

        const int signal =
            mlPrediction.signal;

        const double confidence =
            mlPrediction.confidence;

        ++signalCount;
        totalSignalConfidence += confidence;

        if (signal == 1) {
            ++buySignals;
        } else if (signal == -1) {
            ++sellSignals;
        } else {
            ++holdSignals;
            continue;
        }

        const OrderSide side =
            signal == 1
                ? OrderSide::BUY
                : OrderSide::SELL;

        /*
         * The order price is captured when the signal is generated.
         * Execution happens on a later tick.
         */
        const double price =
            signal == 1
                ? tick.ask_price
                : tick.bid_price;

        Order order(
            nextOrderId++,
            side,
            OrderType::LIMIT,
            price,
            50
        );

        ++totalOrders;

        /*
         * Calculate the net position reserved by orders that
         * are already waiting for execution.
         *
         * This prevents multiple pending orders from collectively
         * exceeding the maximum allowed position.
         */
        std::int64_t pendingPosition = 0;

        for (const auto& pending : pendingOrders_) {

            if (pending.order.side == OrderSide::BUY) {
                pendingPosition +=
                    static_cast<std::int64_t>(
                        pending.order.quantity
                    );
            } else {
                pendingPosition -=
                    static_cast<std::int64_t>(
                        pending.order.quantity
                    );
            }
        }

        /*
         * Risk is checked using:
         *
         * current position
         * + pending position
         * + new order
         */
        if (!riskManager_.validateOrder(
                order,
                portfolio_.position(),
                pendingPosition)) {

            ++rejectedOrders;
            continue;
        }

        if (!oms_.submitOrder(order)) {

            ++rejectedOrders;
            continue;
        }

        oms_.acceptOrder(order.id);

        if (database_ != nullptr) {
            database_->insertOrder(
                order,
                tick.symbol,
                "ACCEPTED"
            );
        }

        /*
         * Submit to the pending queue.
         *
         * Signal at tick i
         * Execution at tick i + 1
         */
        pendingOrders_.push_back(
            PendingOrder{
                order,
                i,
                i + 1,
                i + ORDER_EXPIRY_TICKS
            }
        );
    }

    /*
     * ------------------------------------------------------------
     * 3. FLUSH PENDING ORDERS
     * ------------------------------------------------------------
     *
     * Orders submitted on the final tick still need a market
     * snapshot for execution.
     */
    if (!pendingOrders_.empty()) {

        const MarketTick finalExecutionTick =
            marketData_.nextTick();

        orderBook_.updateFromMarketData(
            finalExecutionTick
        );

        portfolio_.markToMarket(
            finalExecutionTick.bid_price
        );

        while (!pendingOrders_.empty()) {

            PendingOrder pending =
                pendingOrders_.front();

            pendingOrders_.pop_front();

            const Order& order =
                pending.order;

            const ExecutionResult execution =
                executionEngine_.executeOrder(
                    order,
                    finalExecutionTick
                );

            if (!execution.filled) {

                oms_.cancelOrder(order.id);
                continue;
            }

            ++filledOrders;

            turnover +=
                execution.executionPrice *
                static_cast<double>(
                    execution.filledQuantity
                );

            oms_.fillOrder(
                order.id,
                execution.filledQuantity
            );

            const std::int64_t positionBefore =
                portfolio_.position();

            const double realizedBefore =
                portfolio_.realizedPnL();

            std::uint64_t closedQuantity = 0;

            if (positionBefore > 0 &&
                order.side == OrderSide::SELL) {

                closedQuantity =
                    std::min<std::uint64_t>(
                        execution.filledQuantity,
                        static_cast<std::uint64_t>(
                            positionBefore
                        )
                    );

            } else if (positionBefore < 0 &&
                       order.side == OrderSide::BUY) {

                closedQuantity =
                    std::min<std::uint64_t>(
                        execution.filledQuantity,
                        static_cast<std::uint64_t>(
                            -positionBefore
                        )
                    );
            }

            if (positionBefore == 0) {

                entryPrice =
                    execution.executionPrice;

                entryTimestampNs =
                    finalExecutionTick.timestamp_ns;

                entryQuantity =
                    execution.filledQuantity;
            }

            portfolio_.processFill(
                order,
                execution.executionPrice,
                execution.filledQuantity,
                execution.fee
            );

            portfolio_.markToMarket(
                finalExecutionTick.bid_price
            );

            const double realizedAfter =
                portfolio_.realizedPnL();

            const double closedTradePnL =
                realizedAfter - realizedBefore;

            if (closedQuantity > 0) {

                TradeRecord trade{
                    static_cast<std::uint64_t>(
                        tradeLedger_.size() + 1
                    ),

                    positionBefore > 0
                        ? OrderSide::BUY
                        : OrderSide::SELL,

                    entryPrice,
                    execution.executionPrice,
                    closedQuantity,
                    closedTradePnL,
                    entryTimestampNs,
                    finalExecutionTick.timestamp_ns
                };

                tradeLedger_.recordTrade(trade);

                result.tradePnLs.push_back(
                    closedTradePnL
                );

                if (closedTradePnL > 0.0) {
                    ++winningTrades;
                }

                const std::int64_t positionAfter =
                    portfolio_.position();

                if (positionAfter != 0) {

                    entryPrice =
                        execution.executionPrice;

                    entryTimestampNs =
                        finalExecutionTick.timestamp_ns;

                    entryQuantity =
                        execution.filledQuantity -
                        closedQuantity;

                } else {

                    entryPrice = 0.0;
                    entryTimestampNs = 0;
                    entryQuantity = 0;
                }
            }
        }
    }

    /*
     * Final mark-to-market snapshot.
     */
    const MarketTick finalTick =
        marketData_.nextTick();

    portfolio_.markToMarket(
        finalTick.bid_price
    );

    const double finalEquity =
        portfolio_.cash() +
        static_cast<double>(
            portfolio_.position()
        ) * finalTick.bid_price;

    result.equityCurve.push_back(
        finalEquity
    );

    result.totalTicks = ticks;
    result.totalOrders = totalOrders;
    result.filledOrders = filledOrders;
    result.rejectedOrders = rejectedOrders;
    result.expiredOrders = expiredOrders;
    result.partialFills = partialFills;
    result.delayedFillAttempts = delayedFillAttempts;

    result.finalPosition =
        portfolio_.position();

    result.finalCash =
        portfolio_.cash();

    result.realizedPnL =
        portfolio_.realizedPnL();

    result.unrealizedPnL =
        portfolio_.unrealizedPnL();

    result.totalPnL =
        portfolio_.totalPnL();

    result.equityPnL =
        finalEquity - result.initialCash;

    result.pnlReconciliationError =
        result.equityPnL - result.totalPnL;

    result.feesPaid =
        portfolio_.feesPaid();

    result.turnover =
        turnover;

    result.buySignals =
        buySignals;

    result.sellSignals =
        sellSignals;

    result.holdSignals =
        holdSignals;

    result.averageSignalConfidence =
        signalCount > 0
            ? totalSignalConfidence /
              static_cast<double>(signalCount)
            : 0.0;

    const std::uint64_t completedTrades =
        static_cast<std::uint64_t>(
            result.tradePnLs.size()
        );

    if (completedTrades > 0) {

        result.winRate =
            static_cast<double>(winningTrades) /
            static_cast<double>(completedTrades);
    } else {

        result.winRate = 0.0;
    }

    return result;
}

} // namespace hft
