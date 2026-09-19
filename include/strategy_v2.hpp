#pragma once

#include "features.hpp"

namespace hft {

enum class AdvancedSignal {
    BUY,
    SELL,
    HOLD
};

struct StrategyDecision {
    AdvancedSignal signal;
    double score;
    double confidence;
};

class MultiSignalStrategy {
public:
    MultiSignalStrategy(
        double buyThreshold = 0.25,
        double sellThreshold = -0.25
    );

    StrategyDecision decide(
        const MarketFeatures& features
    ) const;

private:
    double buyThreshold_;
    double sellThreshold_;
};

} // namespace hft
