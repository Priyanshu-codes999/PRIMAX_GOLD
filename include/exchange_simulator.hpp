#pragma once

#include "market_data.hpp"
#include "order.hpp"

#include <cstdint>

namespace hft {

struct ExecutionResult {
    bool filled;
    std::uint64_t filledQuantity;
    double executionPrice;
    double fee;
    std::uint64_t latencyNs;
};

class ExchangeSimulator {
public:
    explicit ExchangeSimulator(
        double feeRate = 0.0004,
        double slippageBps = 1.0,
        double marketImpactBps = 0.5
    );

    ExecutionResult execute(
        const Order& order,
        const MarketTick& market
    ) const;

private:
    double feeRate_;
    double slippageBps_;
    double marketImpactBps_;
};

} // namespace hft
