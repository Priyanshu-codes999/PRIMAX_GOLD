#pragma once

#include "order.hpp"
#include "market_data.hpp"

#include <cstdint>
#include <functional>
#include <map>
#include <optional>

namespace hft {

class OrderBook {
public:
    bool addOrder(const Order& order);
    bool cancelOrder(std::uint64_t orderId);

    void updateFromMarketData(const MarketTick& tick);

    std::optional<double> bestBid() const;
    std::optional<double> bestAsk() const;

    std::uint64_t bidVolume() const;
    std::uint64_t askVolume() const;

    double spread() const;

    void print() const;

private:
    std::map<double, std::uint64_t, std::greater<double>> bids_;
    std::map<double, std::uint64_t> asks_;

    std::map<std::uint64_t, Order> orders_;
};

} // namespace hft
