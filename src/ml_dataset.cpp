#include "ml_dataset.hpp"

#include "order_book.hpp"

#include <cmath>
#include <fstream>
#include <iomanip>
#include <vector>

namespace hft {

std::vector<TrainingSample> MLDatasetGenerator::generate(
    MarketDataSimulator& marketData,
    std::size_t samples,
    std::size_t horizon,
    double thresholdBps
) const {

    std::vector<MarketTick> ticks;
    ticks.reserve(samples + horizon);

    for (std::size_t i = 0; i < samples + horizon; ++i) {
        ticks.push_back(marketData.nextTick());
    }

    OrderBook orderBook;
    FeatureEngine featureEngine;

    std::vector<TrainingSample> dataset;
    dataset.reserve(samples);

    for (std::size_t i = 0; i < samples; ++i) {

        orderBook.updateFromMarketData(ticks[i]);

        const MarketFeatures features =
            featureEngine.calculate(orderBook, ticks[i]);

        const double currentMid =
            (ticks[i].bid_price + ticks[i].ask_price) / 2.0;

        const double futureMid =
            (ticks[i + horizon].bid_price +
             ticks[i + horizon].ask_price) / 2.0;

        const double futureReturnBps =
            ((futureMid - currentMid) / currentMid) * 10000.0;

        int label = 0;

        if (futureReturnBps >= thresholdBps) {
            label = 1;
        } else if (futureReturnBps <= -thresholdBps) {
            label = -1;
        }

        dataset.push_back(
            TrainingSample{
                features.imbalance,
                features.momentum,
                features.spread,
                features.volatility,
                futureReturnBps,
                label
            }
        );
    }

    return dataset;
}

bool MLDatasetGenerator::saveCsv(
    const std::vector<TrainingSample>& samples,
    const std::string& filename
) const {

    std::ofstream file(filename);

    if (!file.is_open()) {
        return false;
    }

    file << "imbalance,momentum,spread,volatility,"
            "future_return_bps,label\n";

    file << std::fixed << std::setprecision(8);

    for (const auto& sample : samples) {

        file << sample.imbalance << ','
             << sample.momentum << ','
             << sample.spread << ','
             << sample.volatility << ','
             << sample.futureReturnBps << ','
             << sample.label << '\n';
    }

    return true;
}

} // namespace hft
