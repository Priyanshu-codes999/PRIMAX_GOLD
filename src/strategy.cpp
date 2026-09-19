#include "strategy.hpp"

namespace hft {

OrderBookImbalanceStrategy::OrderBookImbalanceStrategy(
    double threshold
)
    : threshold_(threshold) {
}

double OrderBookImbalanceStrategy::calculateImbalance(
    const OrderBook& orderBook
) const {

    const double bidVolume =
        static_cast<double>(orderBook.bidVolume());

    const double askVolume =
        static_cast<double>(orderBook.askVolume());

    const double totalVolume =
        bidVolume + askVolume;

    if (totalVolume == 0.0) {
        return 0.0;
    }

    return (bidVolume - askVolume) / totalVolume;
}

Signal OrderBookImbalanceStrategy::generateSignal(
    const OrderBook& orderBook
) const {

    const double imbalance =
        calculateImbalance(orderBook);

    if (imbalance >= threshold_) {
        return Signal::BUY;
    }

    if (imbalance <= -threshold_) {
        return Signal::SELL;
    }

    return Signal::HOLD;
}

} // namespace hft
