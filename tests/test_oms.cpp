#include "oms.hpp"

#include <cassert>
#include <iostream>

int main() {

    hft::OrderManagementSystem oms;

    hft::Order order(
        100,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        50
    );

    assert(oms.submitOrder(order));

    assert(oms.acceptOrder(100));

    auto managed = oms.getOrder(100);

    assert(managed.has_value());
    assert(
        managed->status ==
        hft::OrderStatus::ACCEPTED
    );

    assert(oms.fillOrder(100, 50));

    managed = oms.getOrder(100);

    assert(managed.has_value());
    assert(
        managed->status ==
        hft::OrderStatus::FILLED
    );

    assert(
        managed->filledQuantity == 50
    );

    std::cout << "OMS tests PASSED\n";

    return 0;
}
