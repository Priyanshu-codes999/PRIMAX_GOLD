#include "ml_strategy.hpp"

namespace hft {

MLStrategy::MLStrategy(
    MLInferenceEngine& inferenceEngine,
    double minConfidence
)
    : inferenceEngine_(inferenceEngine),
      minConfidence_(minConfidence) {
}

MLPrediction MLStrategy::decide(
    const MarketFeatures& features
) {

    MLPrediction prediction =
        inferenceEngine_.predict(features);

    if (prediction.confidence < minConfidence_) {
        prediction.signal = 0;
    }

    return prediction;
}

} // namespace hft
