#pragma once

#include "features.hpp"

#include <string>

namespace hft {

struct MLPrediction {
    int signal;          // -1 = SELL, 0 = HOLD, 1 = BUY
    double confidence;
    double sellProbability;
    double holdProbability;
    double buyProbability;
};

class MLInferenceEngine {
public:
    explicit MLInferenceEngine(const std::string& modelPath);

    MLPrediction predict(
        const MarketFeatures& features
    );

private:
    class Impl;
    Impl* impl_;
};

} // namespace hft
