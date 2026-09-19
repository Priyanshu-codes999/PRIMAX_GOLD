#include "strategy_v2.hpp"

#include <cassert>
#include <cmath>
#include <iostream>

int main() {

    hft::MultiSignalStrategy strategy(0.25, -0.25);

    // Strong bullish conditions
    hft::MarketFeatures bullish{
        0.80,   // imbalance
        0.08,   // momentum
        0.10,   // spread
        0.08    // volatility
    };

    const auto buyDecision =
        strategy.decide(bullish);

    assert(
        buyDecision.signal ==
        hft::AdvancedSignal::BUY
    );

    assert(buyDecision.score > 0.25);
    assert(buyDecision.confidence > 0.0);

    // Strong bearish conditions
    hft::MarketFeatures bearish{
        -0.80,
        -0.08,
        0.10,
        0.08
    };

    const auto sellDecision =
        strategy.decide(bearish);

    assert(
        sellDecision.signal ==
        hft::AdvancedSignal::SELL
    );

    assert(sellDecision.score < -0.25);

    // Neutral conditions
    hft::MarketFeatures neutral{
        0.0,
        0.0,
        0.10,
        0.0
    };

    const auto holdDecision =
        strategy.decide(neutral);

    assert(
        holdDecision.signal ==
        hft::AdvancedSignal::HOLD
    );

    assert(
        std::abs(holdDecision.score) < 0.000001
    );

    std::cout << "Strategy v2 tests PASSED\n";

    return 0;
}
