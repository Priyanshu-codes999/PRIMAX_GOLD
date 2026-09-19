#include "strategy_v2.hpp"

#include <algorithm>
#include <cmath>

namespace hft {

MultiSignalStrategy::MultiSignalStrategy(
    double buyThreshold,
    double sellThreshold
)
    : buyThreshold_(buyThreshold),
      sellThreshold_(sellThreshold) {
}

StrategyDecision MultiSignalStrategy::decide(
    const MarketFeatures& features
) const {

    /*
     * Normalize momentum approximately around
     * the same scale as imbalance.
     */
    const double momentumSignal =
        std::clamp(
            features.momentum / 0.10,
            -1.0,
            1.0
        );

    /*
     * Positive imbalance and momentum support BUY.
     * Negative imbalance and momentum support SELL.
     */
    const double imbalanceWeight = 0.50;
    const double momentumWeight = 0.35;
    const double volatilityWeight = 0.15;

    const double volatilityPenalty =
        std::clamp(
            features.volatility / 0.10,
            0.0,
            1.0
        );

    double score =
        imbalanceWeight * features.imbalance +
        momentumWeight * momentumSignal;

    /*
     * High volatility reduces confidence rather than
     * directly forcing a BUY or SELL.
     */
    if (score > 0.0) {
        score -= volatilityWeight * volatilityPenalty;
    } else if (score < 0.0) {
        score += volatilityWeight * volatilityPenalty;
    }

    AdvancedSignal signal =
        AdvancedSignal::HOLD;

    if (score >= buyThreshold_) {
        signal = AdvancedSignal::BUY;
    } else if (score <= sellThreshold_) {
        signal = AdvancedSignal::SELL;
    }

    const double confidence =
        std::clamp(
            std::abs(score),
            0.0,
            1.0
        );

    return StrategyDecision{
        signal,
        score,
        confidence
    };
}

} // namespace hft
