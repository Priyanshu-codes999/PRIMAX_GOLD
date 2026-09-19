#pragma once

#include "exchange_simulator.hpp"
#include "order.hpp"

#include <cstdint>

namespace hft {

class ExecutionEngine {
public:
    explicit ExecutionEngine(
        ExchangeSimulator& exchange,
        std::uint64_t simulatedLatencyNs = 1000
    );

    ExecutionResult executeOrder(
        const Order& order,
        const MarketTick& market
    ) const;

private:
    ExchangeSimulator& exchange_;
    std::uint64_t simulatedLatencyNs_;
};

} // namespace hft
