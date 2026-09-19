#pragma once

#include "market_data.hpp"
#include "order_book.hpp"

namespace hft {

struct MarketFeatures {
    double imbalance;
    double momentum;
    double spread;
    double volatility;
};

class FeatureEngine {
public:
    MarketFeatures calculate(
        const OrderBook& orderBook,
        const MarketTick& tick
    ) const;

private:
    mutable double previousMidPrice_ = 0.0;
    mutable double previousMomentum_ = 0.0;
};

} // namespace hft
