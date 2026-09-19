#pragma once

#include "order.hpp"

#include <cstdint>

namespace hft {

struct TradeRecord {
    std::uint64_t tradeId;

    OrderSide side;

    double entryPrice;
    double exitPrice;

    std::uint64_t quantity;

    double realizedPnL;

    std::uint64_t entryTimestampNs;
    std::uint64_t exitTimestampNs;
};

} // namespace hft
