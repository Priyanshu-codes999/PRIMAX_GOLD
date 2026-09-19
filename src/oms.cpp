#include "oms.hpp"

#include <iostream>

namespace hft {

bool OrderManagementSystem::submitOrder(
    const Order& order
) {

    if (orders_.contains(order.id)) {
        return false;
    }

    ManagedOrder managed{
        order,
        OrderStatus::NEW,
        0
    };

    orders_.emplace(order.id, managed);

    return true;
}

bool OrderManagementSystem::acceptOrder(
    std::uint64_t orderId
) {

    auto it = orders_.find(orderId);

    if (it == orders_.end()) {
        return false;
    }

    if (it->second.status != OrderStatus::NEW) {
        return false;
    }

    it->second.status = OrderStatus::ACCEPTED;

    return true;
}

bool OrderManagementSystem::fillOrder(
    std::uint64_t orderId,
    std::uint64_t quantity
) {

    auto it = orders_.find(orderId);

    if (it == orders_.end()) {
        return false;
    }

    auto& managedOrder = it->second;

    if (managedOrder.status != OrderStatus::ACCEPTED &&
        managedOrder.status != OrderStatus::PARTIALLY_FILLED) {
        return false;
    }

    if (quantity == 0) {
        return false;
    }

    const std::uint64_t remaining =
        managedOrder.order.quantity -
        managedOrder.filledQuantity;

    if (quantity > remaining) {
        return false;
    }

    managedOrder.filledQuantity += quantity;

    if (managedOrder.filledQuantity ==
        managedOrder.order.quantity) {

        managedOrder.status = OrderStatus::FILLED;

    } else {

        managedOrder.status =
            OrderStatus::PARTIALLY_FILLED;
    }

    return true;
}

bool OrderManagementSystem::cancelOrder(
    std::uint64_t orderId
) {

    auto it = orders_.find(orderId);

    if (it == orders_.end()) {
        return false;
    }

    if (it->second.status == OrderStatus::FILLED ||
        it->second.status == OrderStatus::CANCELLED ||
        it->second.status == OrderStatus::REJECTED) {
        return false;
    }

    it->second.status = OrderStatus::CANCELLED;

    return true;
}

bool OrderManagementSystem::rejectOrder(
    std::uint64_t orderId
) {

    auto it = orders_.find(orderId);

    if (it == orders_.end()) {
        return false;
    }

    if (it->second.status != OrderStatus::NEW) {
        return false;
    }

    it->second.status = OrderStatus::REJECTED;

    return true;
}

std::optional<ManagedOrder>
OrderManagementSystem::getOrder(
    std::uint64_t orderId
) const {

    auto it = orders_.find(orderId);

    if (it == orders_.end()) {
        return std::nullopt;
    }

    return it->second;
}

void OrderManagementSystem::printOrder(
    std::uint64_t orderId
) const {

    auto order = getOrder(orderId);

    if (!order) {
        std::cout << "Order not found\n";
        return;
    }

    std::cout << "\n---------- ORDER ----------\n";

    std::cout << "ID       : "
              << order->order.id << '\n';

    std::cout << "Price    : "
              << order->order.price << '\n';

    std::cout << "Quantity : "
              << order->order.quantity << '\n';

    std::cout << "Filled   : "
              << order->filledQuantity << '\n';

    std::cout << "Status   : ";

    switch (order->status) {

        case OrderStatus::NEW:
            std::cout << "NEW";
            break;

        case OrderStatus::ACCEPTED:
            std::cout << "ACCEPTED";
            break;

        case OrderStatus::PARTIALLY_FILLED:
            std::cout << "PARTIALLY_FILLED";
            break;

        case OrderStatus::FILLED:
            std::cout << "FILLED";
            break;

        case OrderStatus::CANCELLED:
            std::cout << "CANCELLED";
            break;

        case OrderStatus::REJECTED:
            std::cout << "REJECTED";
            break;
    }

    std::cout << "\n---------------------------\n";
}

} // namespace hft
