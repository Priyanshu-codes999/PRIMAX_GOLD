#include "features.hpp"

#include <cmath>

namespace hft {

MarketFeatures FeatureEngine::calculate(
    const OrderBook& orderBook,
    const MarketTick& tick
) const {

    const double bidVolume =
        static_cast<double>(orderBook.bidVolume());

    const double askVolume =
        static_cast<double>(orderBook.askVolume());

    double imbalance = 0.0;

    const double totalVolume =
        bidVolume + askVolume;

    if (totalVolume > 0.0) {
        imbalance =
            (bidVolume - askVolume) /
            totalVolume;
    }

    const double midPrice =
        (tick.bid_price + tick.ask_price) / 2.0;

    double momentum = 0.0;

    if (previousMidPrice_ > 0.0) {
        momentum =
            midPrice - previousMidPrice_;
    }

    const double spread =
        tick.ask_price - tick.bid_price;

    const double volatility =
        std::abs(momentum);

    previousMidPrice_ = midPrice;
    previousMomentum_ = momentum;

    return MarketFeatures{
        imbalance,
        momentum,
        spread,
        volatility
    };
}

} // namespace hft
