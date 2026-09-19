#pragma once

#include <cstdint>
#include <vector>

namespace hft {

struct LatencyStats {
    std::uint64_t samples;
    std::uint64_t minNs;
    std::uint64_t maxNs;

    double averageNs;

    std::uint64_t p50Ns;
    std::uint64_t p95Ns;
    std::uint64_t p99Ns;
};

class LatencyBenchmark {
public:
    void record(std::uint64_t latencyNs);

    LatencyStats calculate() const;

private:
    std::vector<std::uint64_t> samples_;
};

} // namespace hft
