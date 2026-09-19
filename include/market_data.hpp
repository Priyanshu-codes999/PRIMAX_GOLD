#pragma once

#include <cstdint>
#include <string>

namespace hft {

struct MarketTick {
    std::string symbol;

    double bid_price;
    double ask_price;

    std::uint64_t bid_quantity;
    std::uint64_t ask_quantity;

    std::uint64_t timestamp_ns;
};

class MarketDataSimulator {
public:
    explicit MarketDataSimulator(const std::string& symbol);

    MarketTick nextTick();

private:
    std::string symbol_;

    double mid_price_;
    std::uint64_t sequence_;
};

} // namespace hft
