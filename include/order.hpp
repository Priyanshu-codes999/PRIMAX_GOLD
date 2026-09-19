#pragma once

#include <cstdint>

namespace hft {

enum class OrderSide {
    BUY,
    SELL
};

enum class OrderType {
    MARKET,
    LIMIT
};

struct Order {
    std::uint64_t id;
    OrderSide side;
    OrderType type;
    double price;
    std::uint64_t quantity;

    Order(
        std::uint64_t id,
        OrderSide side,
        OrderType type,
        double price,
        std::uint64_t quantity
    )
        : id(id),
          side(side),
          type(type),
          price(price),
          quantity(quantity) {}
};

} // namespace hft
