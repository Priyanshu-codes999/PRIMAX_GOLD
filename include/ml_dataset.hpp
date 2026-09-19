#pragma once

#include "features.hpp"
#include "market_data.hpp"

#include <cstddef>
#include <string>
#include <vector>

namespace hft {

struct TrainingSample {
    double imbalance;
    double momentum;
    double spread;
    double volatility;

    double futureReturnBps;

    // 1 = BUY, 0 = HOLD, -1 = SELL
    int label;
};

class MLDatasetGenerator {
public:
    std::vector<TrainingSample> generate(
        MarketDataSimulator& marketData,
        std::size_t samples,
        std::size_t horizon = 5,
        double thresholdBps = 2.0
    ) const;

    bool saveCsv(
        const std::vector<TrainingSample>& samples,
        const std::string& filename
    ) const;
};

} // namespace hft
