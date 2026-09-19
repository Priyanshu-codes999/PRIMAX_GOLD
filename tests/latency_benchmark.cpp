#include "benchmark.hpp"
#include "exchange_simulator.hpp"
#include "execution.hpp"
#include "market_data.hpp"
#include "oms.hpp"
#include "order_book.hpp"
#include "risk_manager.hpp"
#include "strategy.hpp"

#include <chrono>
#include <iomanip>
#include <iostream>

int main() {

    constexpr int ITERATIONS = 10000;

    hft::MarketDataSimulator marketData(
        "BTCUSDT"
    );

    hft::OrderBook orderBook;

    hft::OrderBookImbalanceStrategy strategy(
        0.10
    );

    hft::RiskLimits limits{
        100,
        500,
        50000.0
    };

    hft::RiskManager riskManager(
        limits
    );

    hft::ExchangeSimulator exchange;

    hft::ExecutionEngine execution(
        exchange
    );

    hft::LatencyBenchmark benchmark;

    for (int i = 0; i < ITERATIONS; ++i) {

        const auto start =
            std::chrono::steady_clock::now();

        const hft::MarketTick tick =
            marketData.nextTick();

        orderBook.updateFromMarketData(
            tick
        );

        const hft::Signal signal =
            strategy.generateSignal(
                orderBook
            );

        if (signal != hft::Signal::HOLD) {

            const hft::OrderSide side =
                signal == hft::Signal::BUY
                    ? hft::OrderSide::BUY
                    : hft::OrderSide::SELL;

            const double price =
                signal == hft::Signal::BUY
                    ? tick.ask_price
                    : tick.bid_price;

            hft::Order order(
                static_cast<std::uint64_t>(i),
                side,
                hft::OrderType::LIMIT,
                price,
                10
            );

            if (riskManager.validateOrder(
                    order,
                    0
                )) {

                execution.executeOrder(
                    order,
                    tick
                );
            }
        }

        const auto end =
            std::chrono::steady_clock::now();

        const auto latency =
            std::chrono::duration_cast<
                std::chrono::nanoseconds
            >(end - start).count();

        benchmark.record(
            static_cast<std::uint64_t>(
                latency
            )
        );
    }

    const hft::LatencyStats stats =
        benchmark.calculate();

    std::cout << "\n=====================================\n";
    std::cout << "       HFT LATENCY BENCHMARK\n";
    std::cout << "=====================================\n";

    std::cout << "Samples      : "
              << stats.samples << '\n';

    std::cout << std::fixed
              << std::setprecision(2);

    std::cout << "Average      : "
              << stats.averageNs
              << " ns\n";

    std::cout << "Minimum      : "
              << stats.minNs
              << " ns\n";

    std::cout << "Maximum      : "
              << stats.maxNs
              << " ns\n";

    std::cout << "P50          : "
              << stats.p50Ns
              << " ns\\n";

    std::cout << "P95          : "
              << stats.p95Ns
              << " ns\\n";

    std::cout << "P99          : "
              << stats.p99Ns
              << " ns\\n";

    std::cout << "=====================================\n";

    return 0;
}
