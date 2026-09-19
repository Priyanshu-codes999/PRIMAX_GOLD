#include "position_manager.hpp"

#include <cassert>
#include <cmath>
#include <iostream>

int main() {

    hft::PositionManager manager;

    // Open LONG: 10 @ 100
    hft::Order buy(
        1,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        10
    );

    auto update =
        manager.processFill(
            buy,
            100.0,
            10
        );

    assert(update.position == 10);

    assert(
        std::abs(
            update.averageEntryPrice - 100.0
        ) < 0.000001
    );

    assert(update.closedQuantity == 0);


    // Close LONG: 10 @ 110
    hft::Order sell(
        2,
        hft::OrderSide::SELL,
        hft::OrderType::LIMIT,
        110.0,
        10
    );

    update =
        manager.processFill(
            sell,
            110.0,
            10
        );

    assert(update.position == 0);

    assert(update.closedQuantity == 10);

    assert(
        std::abs(
            update.realizedPnL - 100.0
        ) < 0.000001
    );


    // Open SHORT: 5 @ 120
    hft::Order shortSell(
        3,
        hft::OrderSide::SELL,
        hft::OrderType::LIMIT,
        120.0,
        5
    );

    update =
        manager.processFill(
            shortSell,
            120.0,
            5
        );

    assert(update.position == -5);


    // Close SHORT: 5 @ 110
    hft::Order cover(
        4,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        110.0,
        5
    );

    update =
        manager.processFill(
            cover,
            110.0,
            5
        );

    assert(update.position == 0);

    assert(
        std::abs(
            update.realizedPnL - 150.0
        ) < 0.000001
    );

    std::cout
        << "Position Manager tests PASSED\n";

    return 0;
}
