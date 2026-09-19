#include "market_data.hpp"

#include <chrono>
#include <cmath>
#include <random>

namespace hft {

MarketDataSimulator::MarketDataSimulator(
    const std::string& symbol
)
    : symbol_(symbol),
      mid_price_(100.0),
      sequence_(0) {
}

MarketTick MarketDataSimulator::nextTick() {

    ++sequence_;

    static std::mt19937 rng(42);

    std::normal_distribution<double> priceNoise(0.0, 0.015);
    std::uniform_int_distribution<int> volumeNoise(-30, 30);

    const double regime =
        std::sin(static_cast<double>(sequence_) * 0.035);

    double drift = 0.0;

    if (regime > 0.55) {
        drift = 0.025;
    } else if (regime < -0.55) {
        drift = -0.025;
    }

    const double movement =
        drift + priceNoise(rng);

    mid_price_ += movement;

    if (mid_price_ < 50.0) {
        mid_price_ = 50.0;
    }

    const double spread =
        0.04 +
        0.02 * (1.0 + std::abs(regime));

    const double bid =
        mid_price_ - spread / 2.0;

    const double ask =
        mid_price_ + spread / 2.0;

    int baseBidVolume = 120;
    int baseAskVolume = 120;

    if (regime > 0.55) {
        baseBidVolume = 190;
        baseAskVolume = 80;
    } else if (regime < -0.55) {
        baseBidVolume = 80;
        baseAskVolume = 190;
    }

    const int bidQuantity =
        std::max(10, baseBidVolume + volumeNoise(rng));

    const int askQuantity =
        std::max(10, baseAskVolume + volumeNoise(rng));

    const auto now =
        std::chrono::steady_clock::now();

    const auto timestamp =
        std::chrono::duration_cast<
            std::chrono::nanoseconds
        >(now.time_since_epoch()).count();

    return MarketTick{
        symbol_,
        bid,
        ask,
        static_cast<std::uint64_t>(bidQuantity),
        static_cast<std::uint64_t>(askQuantity),
        static_cast<std::uint64_t>(timestamp)
    };
}

} // namespace hft
