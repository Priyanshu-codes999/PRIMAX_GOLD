#pragma once

#include "order.hpp"

#include <cstdint>

namespace hft {

struct PositionUpdate {
    std::int64_t position;
    double averageEntryPrice;
    double realizedPnL;
    std::uint64_t closedQuantity;
};

class PositionManager {
public:
    PositionManager();

    PositionUpdate processFill(
        const Order& order,
        double executionPrice,
        std::uint64_t quantity
    );

    std::int64_t position() const;

    double averageEntryPrice() const;

    double realizedPnL() const;

private:
    std::int64_t position_;
    double averageEntryPrice_;
    double realizedPnL_;
};

} // namespace hft
