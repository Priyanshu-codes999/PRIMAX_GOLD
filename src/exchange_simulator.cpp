#include "exchange_simulator.hpp"

#include <algorithm>
#include <chrono>

namespace hft {

ExchangeSimulator::ExchangeSimulator(
    double feeRate,
    double slippageBps,
    double marketImpactBps
)
    : feeRate_(feeRate),
      slippageBps_(slippageBps),
      marketImpactBps_(marketImpactBps) {
}

ExecutionResult ExchangeSimulator::execute(
    const Order& order,
    const MarketTick& market
) const {

    const auto start =
        std::chrono::steady_clock::now();

    std::uint64_t filledQuantity = 0;
    double executionPrice = 0.0;

    if (order.side == OrderSide::BUY) {

        if (order.price >= market.ask_price) {

            filledQuantity =
                std::min(
                    order.quantity,
                    market.ask_quantity
                );

            const double totalSlippageBps =
                slippageBps_ + marketImpactBps_;

            executionPrice =
                market.ask_price *
                (1.0 + totalSlippageBps / 10000.0);
        }

    } else {

        if (order.price <= market.bid_price) {

            filledQuantity =
                std::min(
                    order.quantity,
                    market.bid_quantity
                );

            const double totalSlippageBps =
                slippageBps_ + marketImpactBps_;

            executionPrice =
                market.bid_price *
                (1.0 - totalSlippageBps / 10000.0);
        }
    }

    const bool filled =
        filledQuantity > 0;

    const double notional =
        executionPrice *
        static_cast<double>(filledQuantity);

    const double fee =
        notional * feeRate_;

    const auto end =
        std::chrono::steady_clock::now();

    const auto latency =
        std::chrono::duration_cast<
            std::chrono::nanoseconds
        >(end - start).count();

    return ExecutionResult{
        filled,
        filledQuantity,
        executionPrice,
        fee,
        static_cast<std::uint64_t>(latency)
    };
}

} // namespace hft
