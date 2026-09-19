#include "database.hpp"
#include "exchange_simulator.hpp"
#include "market_data.hpp"
#include "order.hpp"

#include <iostream>
#include <string>

int main() {
    try {
        const std::string connectionString =
            "host=172.30.48.1 port=5432 dbname=HFT_ENGINE user=postgres password=priyanshu1234";

        hft::DatabaseManager db(connectionString);

        if (!db.isConnected()) {
            std::cerr << "Database connection FAILED\n";
            return 1;
        }

        hft::MarketDataSimulator marketSimulator("BTCUSDT");
        const hft::MarketTick tick = marketSimulator.nextTick();

        db.insertMarketTick(tick);

        hft::Order order(
            30000 + static_cast<std::uint64_t>(tick.timestamp_ns % 1000000),
            hft::OrderSide::BUY,
            hft::OrderType::LIMIT,
            tick.ask_price,
            50
        );

        db.insertOrder(
            order,
            "BTCUSDT",
            "ACCEPTED"
        );

        hft::ExchangeSimulator exchange;

        const hft::ExecutionResult result =
            exchange.execute(order, tick);

        if (!result.filled) {
            std::cerr << "Order was not filled\n";
            return 1;
        }

        db.insertExecution(
            order.id,
            "BTCUSDT",
            "BUY",
            result.executionPrice,
            result.filledQuantity,
            result.fee,
            result.latencyNs
        );

        db.upsertPosition(
            "BTCUSDT",
            static_cast<std::int64_t>(result.filledQuantity),
            result.executionPrice,
            0.0
        );

        std::cout << "Position inserted/updated:\n";
        std::cout << "  Quantity : " << result.filledQuantity << "\n";
        std::cout << "  Avg Price: " << result.executionPrice << "\n";

        std::cout << "Database connection: OK\n";
        std::cout << "Market tick inserted: " << tick.symbol << "\n";
        std::cout << "Order inserted: ID=" << order.id << "\n";
        std::cout << "Execution inserted:\n";
        std::cout << "  Quantity : " << result.filledQuantity << "\n";
        std::cout << "  Price    : " << result.executionPrice << "\n";
        std::cout << "  Fee      : " << result.fee << "\n";
        std::cout << "  Latency  : " << result.latencyNs << " ns\n";

        // Portfolio snapshot persistence test
        const double cash = 100000.0;
        const std::int64_t position =
            static_cast<std::int64_t>(result.filledQuantity);

        const double marketPrice = tick.ask_price;

        const double unrealizedPnL =
            (marketPrice - result.executionPrice) *
            static_cast<double>(position);

        const double realizedPnL = 0.0;
        const double feesPaid = result.fee;

        const double totalPnL =
            realizedPnL + unrealizedPnL - feesPaid;

        db.insertPortfolioSnapshot(
            cash,
            position,
            marketPrice,
            realizedPnL,
            unrealizedPnL,
            feesPaid,
            totalPnL
        );

        std::cout << "Portfolio snapshot inserted:\n";
        std::cout << "  Cash         : " << cash << "\n";
        std::cout << "  Position     : " << position << "\n";
        std::cout << "  Market Price : " << marketPrice << "\n";
        std::cout << "  Unrealized   : " << unrealizedPnL << "\n";
        std::cout << "  Fees         : " << feesPaid << "\n";
        std::cout << "  Total P&L    : " << totalPnL << "\n";

        return 0;
    }
    catch (const std::exception& e) {
        std::cerr << "Database test FAILED: "
                  << e.what() << "\n";
        return 1;
    }
}
