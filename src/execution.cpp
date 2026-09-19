#include "execution.hpp"

namespace hft {

ExecutionEngine::ExecutionEngine(
    ExchangeSimulator& exchange,
    std::uint64_t simulatedLatencyNs
)
    : exchange_(exchange),
      simulatedLatencyNs_(simulatedLatencyNs) {
}

ExecutionResult ExecutionEngine::executeOrder(
    const Order& order,
    const MarketTick& market
) const {

    ExecutionResult result =
        exchange_.execute(order, market);

    result.latencyNs += simulatedLatencyNs_;

    return result;
}

} // namespace hft
