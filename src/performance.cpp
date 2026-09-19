#include "performance.hpp"

#include <algorithm>
#include <cmath>
#include <numeric>

namespace hft {

PerformanceMetrics PerformanceAnalyzer::analyze(
    double initialCapital,
    const std::vector<double>& equityCurve,
    const std::vector<double>& tradePnLs
) const {

    PerformanceMetrics metrics{};

    if (initialCapital <= 0.0 ||
        equityCurve.size() < 2) {

        return metrics;
    }

    // ---------------------------------------------------------
    // TOTAL RETURN
    // ---------------------------------------------------------

    const double finalEquity =
        equityCurve.back();

    metrics.totalReturnPercent =
        ((finalEquity - initialCapital)
         / initialCapital) * 100.0;


    // ---------------------------------------------------------
    // MAX DRAWDOWN
    // ---------------------------------------------------------

    double peak =
        equityCurve.front();

    double maximumDrawdown = 0.0;

    for (const double equity : equityCurve) {

        peak = std::max(
            peak,
            equity
        );

        if (peak > 0.0) {

            const double drawdown =
                (peak - equity) / peak;

            maximumDrawdown =
                std::max(
                    maximumDrawdown,
                    drawdown
                );
        }
    }

    metrics.maxDrawdownPercent =
        maximumDrawdown * 100.0;


    // ---------------------------------------------------------
    // TRADE STATISTICS
    // ---------------------------------------------------------

    if (!tradePnLs.empty()) {

        const double totalTradePnL =
            std::accumulate(
                tradePnLs.begin(),
                tradePnLs.end(),
                0.0
            );

        metrics.averagePnLPerTrade =
            totalTradePnL /
            static_cast<double>(
                tradePnLs.size()
            );

        double grossProfit = 0.0;
        double grossLoss = 0.0;

        for (const double pnl : tradePnLs) {

            if (pnl > 0.0) {

                grossProfit += pnl;
                ++metrics.winningTrades;

            } else if (pnl < 0.0) {

                grossLoss += std::abs(pnl);
                ++metrics.losingTrades;
            }
        }

        // -----------------------------------------------------
        // PROFIT FACTOR
        //
        // Gross Profit / Gross Loss
        // -----------------------------------------------------

        if (grossLoss > 0.0) {

            metrics.profitFactor =
                grossProfit / grossLoss;

        } else if (grossProfit > 0.0) {

            metrics.profitFactor =
                999.0;

        } else {

            metrics.profitFactor = 0.0;
        }
    }


    // ---------------------------------------------------------
    // SHARPE RATIO
    //
    // Calculate returns between consecutive equity points.
    //
    // Sharpe = mean(return) / stddev(return)
    //
    // This is a per-period Sharpe-style value.
    // It is NOT annualized because our simulated ticks
    // do not represent a real trading calendar.
    // ---------------------------------------------------------

    if (equityCurve.size() >= 2) {

        std::vector<double> returns;

        returns.reserve(
            equityCurve.size() - 1
        );

        for (std::size_t i = 1;
             i < equityCurve.size();
             ++i) {

            const double previous =
                equityCurve[i - 1];

            const double current =
                equityCurve[i];

            if (previous != 0.0) {

                returns.push_back(
                    (current - previous)
                    / previous
                );
            }
        }

        if (returns.size() >= 2) {

            const double mean =
                std::accumulate(
                    returns.begin(),
                    returns.end(),
                    0.0
                ) /
                static_cast<double>(
                    returns.size()
                );

            double variance = 0.0;

            for (const double value : returns) {

                const double difference =
                    value - mean;

                variance +=
                    difference * difference;
            }

            variance /=
                static_cast<double>(
                    returns.size() - 1
                );

            const double standardDeviation =
                std::sqrt(variance);

            if (standardDeviation > 0.0) {

                metrics.sharpeRatio =
                    mean /
                    standardDeviation;

            } else {

                metrics.sharpeRatio = 0.0;
            }
        }
    }

    return metrics;
}

} // namespace hft
