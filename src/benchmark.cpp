#include "benchmark.hpp"

#include <algorithm>
#include <numeric>

namespace hft {

void LatencyBenchmark::record(
    std::uint64_t latencyNs
) {
    samples_.push_back(latencyNs);
}

LatencyStats LatencyBenchmark::calculate() const {

    LatencyStats stats{};

    if (samples_.empty()) {
        return stats;
    }

    std::vector<std::uint64_t> sorted =
        samples_;

    std::sort(
        sorted.begin(),
        sorted.end()
    );

    stats.samples = sorted.size();

    stats.minNs =
        sorted.front();

    stats.maxNs =
        sorted.back();

    const std::uint64_t total =
        std::accumulate(
            sorted.begin(),
            sorted.end(),
            std::uint64_t{0}
        );

    stats.averageNs =
        static_cast<double>(total) /
        static_cast<double>(sorted.size());

    /*
     * Percentile calculation.
     *
     * P50 = median
     * P95 = 95th percentile
     * P99 = 99th percentile
     */
    const auto percentile =
        [&sorted](double p) -> std::uint64_t {

            const std::size_t index =
                static_cast<std::size_t>(
                    p *
                    static_cast<double>(
                        sorted.size() - 1
                    )
                );

            return sorted[index];
        };

    stats.p50Ns = percentile(0.50);
    stats.p95Ns = percentile(0.95);
    stats.p99Ns = percentile(0.99);

    return stats;
}

} // namespace hft
