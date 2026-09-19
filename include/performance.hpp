#pragma once

#include <cstdint>
#include <vector>

namespace hft {

struct PerformanceMetrics {
    double totalReturnPercent;
    double maxDrawdownPercent;
    double averagePnLPerTrade;
    double profitFactor;
    double sharpeRatio;

    std::uint64_t winningTrades;
    std::uint64_t losingTrades;
};

class PerformanceAnalyzer {
public:
    PerformanceMetrics analyze(
        double initialCapital,
        const std::vector<double>& equityCurve,
        const std::vector<double>& tradePnLs
    ) const;
};

} // namespace hft
