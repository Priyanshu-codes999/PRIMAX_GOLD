#pragma once

#include "order.hpp"
#include "position_manager.hpp"

#include <cstdint>

namespace hft {

class Portfolio {
public:
    explicit Portfolio(double initialCash = 100000.0);

    void processFill(
        const Order& order,
        double executionPrice,
        std::uint64_t quantity,
        double fee = 0.0
    );

    void markToMarket(double marketPrice);

    double cash() const;

    std::int64_t position() const;

    double averageEntryPrice() const;

    double realizedPnL() const;

    double unrealizedPnL() const;

    double totalPnL() const;
    double feesPaid() const;

    void print() const;

private:
    double initialCash_;
    double cash_;

    double unrealizedPnL_;
    double feesPaid_;

    PositionManager positionManager_;
};

} // namespace hft
