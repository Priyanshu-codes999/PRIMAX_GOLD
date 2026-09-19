#pragma once

#include "order.hpp"

#include <cstdint>
#include <map>
#include <optional>

namespace hft {

enum class OrderStatus {
    NEW,
    ACCEPTED,
    PARTIALLY_FILLED,
    FILLED,
    CANCELLED,
    REJECTED
};

struct ManagedOrder {
    Order order;
    OrderStatus status;
    std::uint64_t filledQuantity;
};

class OrderManagementSystem {
public:
    bool submitOrder(const Order& order);

    bool acceptOrder(std::uint64_t orderId);

    bool fillOrder(
        std::uint64_t orderId,
        std::uint64_t quantity
    );

    bool cancelOrder(std::uint64_t orderId);

    bool rejectOrder(std::uint64_t orderId);

    std::optional<ManagedOrder> getOrder(
        std::uint64_t orderId
    ) const;

    void printOrder(std::uint64_t orderId) const;

private:
    std::map<std::uint64_t, ManagedOrder> orders_;
};

} // namespace hft
