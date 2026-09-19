#pragma once

#include "order_book.hpp"

namespace hft {

enum class Signal {
    BUY,
    SELL,
    HOLD
};

class OrderBookImbalanceStrategy {
public:
    explicit OrderBookImbalanceStrategy(double threshold = 0.10);

    Signal generateSignal(const OrderBook& orderBook) const;

    double calculateImbalance(
        const OrderBook& orderBook
    ) const;

private:
    double threshold_;
};

} // namespace hft
