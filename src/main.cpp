#include "database.hpp"
#include "exchange_simulator.hpp"
#include "execution.hpp"
#include "features.hpp"
#include "ml_inference.hpp"
#include "ml_strategy.hpp"
#include "oms.hpp"
#include "order_book.hpp"
#include "portfolio.hpp"
#include "risk_manager.hpp"

#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <string>
#include <thread>

int main() {

    std::cout << "\n========================================\n";
    std::cout << "       FINANCIAL ENGINE v1.0\n";
    std::cout << "       LIVE PAPER TRADING\n";
    std::cout << "       XAUUSD + ONNX ML\n";
    std::cout << "========================================\n\n";

    // ---------------------------------------------------------
    // DATABASE
    // ---------------------------------------------------------

    const char* dbPassword = std::getenv("HFT_DB_PASSWORD");

    if (dbPassword == nullptr) {
        std::cerr << "ERROR: HFT_DB_PASSWORD is not set.\n";
        return 1;
    }

    const std::string connectionString =
        std::string("host=172.30.48.1 ") +
        "port=5432 " +
        "dbname=HFT_ENGINE " +
        "user=postgres " +
        "password=" + dbPassword;

    hft::DatabaseManager database(connectionString);

    if (!database.isConnected()) {
        std::cerr << "ERROR: Database connection failed.\n";
        return 1;
    }

    std::cout << "Database         : CONNECTED\n";

    // ---------------------------------------------------------
    // TRADING COMPONENTS
    // ---------------------------------------------------------

    hft::OrderBook orderBook;
    hft::FeatureEngine featureEngine;

    hft::RiskLimits limits{
        1,          // max order quantity
        10,         // max position
        50'000.0    // max notional
    };

    hft::RiskManager riskManager(limits);

    hft::OrderManagementSystem oms;

    hft::ExchangeSimulator exchange(
        0.0004,     // fee rate
        1.0,        // slippage bps
        0.5         // market impact bps
    );

    hft::ExecutionEngine executionEngine(exchange);

    hft::Portfolio portfolio(100000.0);

    // ---------------------------------------------------------
    // ML
    // ---------------------------------------------------------

    const std::string modelPath =
        "ml/hft_ml_model.onnx";

    hft::MLInferenceEngine mlInference(modelPath);

    hft::MLStrategy mlStrategy(
        mlInference,
        0.55
    );

    std::cout << "ML Model         : LOADED\n";
    std::cout << "Instrument       : XAUUSD\n";
    std::cout << "Mode             : PAPER TRADING\n";
    std::cout << "AI Confidence   : >= 55%\n";

    std::cout << "\nWaiting for live MT5 ticks...\n\n";

    // ---------------------------------------------------------
    // LIVE LOOP
    // ---------------------------------------------------------

    std::uint64_t lastTimestamp = 0;
    std::uint64_t nextOrderId = 1;

    while (true) {

        try {

            hft::MarketTick tick{};

            if (!database.getLatestMarketTick(tick)) {
                std::this_thread::sleep_for(
                    std::chrono::milliseconds(100)
                );
                continue;
            }

            // Only process XAUUSD
            if (tick.symbol != "XAUUSD") {
                std::this_thread::sleep_for(
                    std::chrono::milliseconds(100)
                );
                continue;
            }

            // Don't process the same tick repeatedly
            if (tick.timestamp_ns == lastTimestamp) {
                std::this_thread::sleep_for(
                    std::chrono::milliseconds(50)
                );
                continue;
            }

            lastTimestamp = tick.timestamp_ns;

            // -------------------------------------------------
            // MARKET DATA
            // -------------------------------------------------

            orderBook.updateFromMarketData(tick);

            const double midPrice =
                (tick.bid_price + tick.ask_price) / 2.0;

            // -------------------------------------------------
            // FEATURES
            // -------------------------------------------------

            const hft::MarketFeatures features =
                featureEngine.calculate(
                    orderBook,
                    tick
                );

            // -------------------------------------------------
            // AI
            // -------------------------------------------------

            const hft::MLPrediction prediction =
                mlStrategy.decide(features);

            std::string signal;

            if (prediction.signal > 0) {
                signal = "BUY";
            } else if (prediction.signal < 0) {
                signal = "SELL";
            } else {
                signal = "HOLD";
            }

            std::cout << std::fixed
                      << std::setprecision(2);

            std::cout
                << "XAUUSD "
                << "BID=" << tick.bid_price
                << " ASK=" << tick.ask_price
                << " | AI=" << signal
                << " CONF="
                << prediction.confidence * 100.0
                << "%";

            std::cout << "\n";

            // -------------------------------------------------
            // HOLD
            // -------------------------------------------------

            if (prediction.signal == 0) {
                portfolio.markToMarket(midPrice);

                std::cout
                    << "  -> HOLD"
                    << " | Position="
                    << portfolio.position()
                    << " | P&L="
                    << portfolio.totalPnL()
                    << "\n";

                continue;
            }

            // -------------------------------------------------
            // ORDER
            // -------------------------------------------------

            const hft::OrderSide side =
                prediction.signal > 0
                    ? hft::OrderSide::BUY
                    : hft::OrderSide::SELL;

            const double orderPrice =
                side == hft::OrderSide::BUY
                    ? tick.ask_price
                    : tick.bid_price;

            // Small paper quantity
            constexpr std::uint64_t quantity = 1;

            hft::Order order(
                nextOrderId++,
                side,
                hft::OrderType::LIMIT,
                orderPrice,
                quantity
            );

            // -------------------------------------------------
            // RISK
            // -------------------------------------------------

            const std::int64_t currentPosition =
                portfolio.position();

            if (!riskManager.validateOrder(
                    order,
                    currentPosition,
                    0)) {

                std::cout
                    << "  -> RISK REJECTED\n";

                database.insertOrder(
                    order,
                    tick.symbol,
                    "REJECTED"
                );

                continue;
            }

            // -------------------------------------------------
            // OMS
            // -------------------------------------------------

            if (!oms.submitOrder(order)) {

                std::cout
                    << "  -> OMS SUBMIT FAILED\n";

                continue;
            }

            if (!oms.acceptOrder(order.id)) {

                std::cout
                    << "  -> OMS ACCEPT FAILED\n";

                continue;
            }

            database.insertOrder(
                order,
                tick.symbol,
                "ACCEPTED"
            );

            // -------------------------------------------------
            // PAPER EXECUTION
            // -------------------------------------------------

            const hft::ExecutionResult execution =
                executionEngine.executeOrder(
                    order,
                    tick
                );

            if (!execution.filled) {

                std::cout
                    << "  -> NO FILL\n";

                oms.cancelOrder(order.id);

                continue;
            }

            // -------------------------------------------------
            // OMS FILL
            // -------------------------------------------------

            if (!oms.fillOrder(
                    order.id,
                    execution.filledQuantity)) {

                std::cout
                    << "  -> OMS FILL FAILED\n";

                continue;
            }

            // -------------------------------------------------
            // PORTFOLIO
            // -------------------------------------------------

            portfolio.processFill(
                order,
                execution.executionPrice,
                execution.filledQuantity,
                execution.fee
            );

            portfolio.markToMarket(midPrice);

            // -------------------------------------------------
            // DATABASE
            // -------------------------------------------------

            const std::string sideString =
                side == hft::OrderSide::BUY
                    ? "BUY"
                    : "SELL";

            database.insertExecution(
                order.id,
                tick.symbol,
                sideString,
                execution.executionPrice,
                execution.filledQuantity,
                execution.fee,
                execution.latencyNs
            );

            database.upsertPosition(
                tick.symbol,
                portfolio.position(),
                portfolio.averageEntryPrice(),
                portfolio.realizedPnL()
            );

            database.insertPortfolioSnapshot(
                portfolio.cash(),
                portfolio.position(),
                midPrice,
                portfolio.realizedPnL(),
                portfolio.unrealizedPnL(),
                portfolio.feesPaid(),
                portfolio.totalPnL()
            );

            // -------------------------------------------------
            // OUTPUT
            // -------------------------------------------------

            std::cout
                << "  -> PAPER "
                << sideString
                << " EXECUTED"
                << " | Qty="
                << execution.filledQuantity
                << " | Price="
                << execution.executionPrice
                << " | Fee="
                << execution.fee
                << "\n";

            std::cout
                << "  -> Position="
                << portfolio.position()
                << " | P&L="
                << portfolio.totalPnL()
                << "\n\n";

        }
        catch (const std::exception& e) {

            std::cerr
                << "LIVE ENGINE ERROR: "
                << e.what()
                << "\n";

            std::this_thread::sleep_for(
                std::chrono::milliseconds(500)
            );
        }

        // 50ms polling interval
        std::this_thread::sleep_for(
            std::chrono::milliseconds(50)
        );
    }

    return 0;
}
