#include "order_book.hpp"

#include <iostream>

namespace hft {

bool OrderBook::addOrder(const Order& order) {

    if (orders_.contains(order.id)) {
        return false;
    }

    if (order.quantity == 0 || order.price <= 0.0) {
        return false;
    }

    orders_.emplace(order.id, order);

    if (order.side == OrderSide::BUY) {
        bids_[order.price] += order.quantity;
    } else {
        asks_[order.price] += order.quantity;
    }

    return true;
}

bool OrderBook::cancelOrder(std::uint64_t orderId) {

    auto it = orders_.find(orderId);

    if (it == orders_.end()) {
        return false;
    }

    const Order& order = it->second;

    if (order.side == OrderSide::BUY) {

        auto level = bids_.find(order.price);

        if (level != bids_.end()) {
            level->second -= order.quantity;

            if (level->second == 0) {
                bids_.erase(level);
            }
        }

    } else {

        auto level = asks_.find(order.price);

        if (level != asks_.end()) {
            level->second -= order.quantity;

            if (level->second == 0) {
                asks_.erase(level);
            }
        }
    }

    orders_.erase(it);

    return true;
}

void OrderBook::updateFromMarketData(
    const MarketTick& tick
) {
    bids_.clear();
    asks_.clear();

    bids_[tick.bid_price] = tick.bid_quantity;
    asks_[tick.ask_price] = tick.ask_quantity;
}

std::optional<double> OrderBook::bestBid() const {

    if (bids_.empty()) {
        return std::nullopt;
    }

    return bids_.begin()->first;
}

std::optional<double> OrderBook::bestAsk() const {

    if (asks_.empty()) {
        return std::nullopt;
    }

    return asks_.begin()->first;
}

std::uint64_t OrderBook::bidVolume() const {

    std::uint64_t total = 0;

    for (const auto& [price, quantity] : bids_) {
        total += quantity;
    }

    return total;
}

std::uint64_t OrderBook::askVolume() const {

    std::uint64_t total = 0;

    for (const auto& [price, quantity] : asks_) {
        total += quantity;
    }

    return total;
}

double OrderBook::spread() const {

    if (bids_.empty() || asks_.empty()) {
        return 0.0;
    }

    return asks_.begin()->first - bids_.begin()->first;
}

void OrderBook::print() const {

    std::cout << "\n========== ORDER BOOK ==========\n";

    std::cout << "ASKS:\n";

    for (const auto& [price, quantity] : asks_) {
        std::cout << price << " x " << quantity << '\n';
    }

    std::cout << "-------------------------------\n";

    std::cout << "BIDS:\n";

    for (const auto& [price, quantity] : bids_) {
        std::cout << price << " x " << quantity << '\n';
    }

    std::cout << "-------------------------------\n";

    if (bestBid()) {
        std::cout << "Best Bid : " << *bestBid() << '\n';
    }

    if (bestAsk()) {
        std::cout << "Best Ask : " << *bestAsk() << '\n';
    }

    std::cout << "Spread   : " << spread() << '\n';
    std::cout << "Bid Vol  : " << bidVolume() << '\n';
    std::cout << "Ask Vol  : " << askVolume() << '\n';

    std::cout << "================================\n";
}

} // namespace hft
