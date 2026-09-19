#pragma once

#include "ml_inference.hpp"

namespace hft {

class MLStrategy {
public:
    explicit MLStrategy(
        MLInferenceEngine& inferenceEngine,
        double minConfidence = 0.55
    );

    MLPrediction decide(
        const MarketFeatures& features
    );

private:
    MLInferenceEngine& inferenceEngine_;
    double minConfidence_;
};

} // namespace hft
