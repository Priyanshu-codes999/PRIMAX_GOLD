#include "exchange_simulator.hpp"

#include <cassert>
#include <cmath>
#include <iostream>

int main() {

    hft::ExchangeSimulator exchange(
        0.0004,  // fee rate
        1.0,     // slippage bps
        0.5      // market impact bps
    );

    hft::MarketTick market{
        "BTCUSDT",
        100.00,     // bid
        100.10,     // ask
        100,        // bid quantity
        20,         // ask quantity
        123456789
    };

    // ------------------------------------------------------------
    // Partial BUY fill
    //
    // Order quantity = 50
    // Ask quantity   = 20
    // Expected fill  = 20
    // ------------------------------------------------------------

    hft::Order buyOrder(
        1,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.10,
        50
    );

    const hft::ExecutionResult buyResult =
        exchange.execute(
            buyOrder,
            market
        );

    assert(buyResult.filled);
    assert(buyResult.filledQuantity == 20);
    assert(buyResult.executionPrice > 100.10);
    assert(buyResult.fee > 0.0);

    // ------------------------------------------------------------
    // Partial SELL fill
    //
    // Order quantity = 50
    // Bid quantity   = 100
    // Expected fill  = 50 (full fill)
    // ------------------------------------------------------------

    hft::Order sellOrder(
        2,
        hft::OrderSide::SELL,
        hft::OrderType::LIMIT,
        100.00,
        50
    );

    const hft::ExecutionResult sellResult =
        exchange.execute(
            sellOrder,
            market
        );

    assert(sellResult.filled);
    assert(sellResult.filledQuantity == 50);
    assert(sellResult.executionPrice < 100.00);
    assert(sellResult.fee > 0.0);

    // ------------------------------------------------------------
    // BUY order should not fill when limit is below ask
    // ------------------------------------------------------------

    hft::Order rejectedBuy(
        3,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.00,
        10
    );

    const hft::ExecutionResult rejectedResult =
        exchange.execute(
            rejectedBuy,
            market
        );

    assert(!rejectedResult.filled);
    assert(rejectedResult.filledQuantity == 0);

    std::cout << "Exchange Simulator tests PASSED\n";
    std::cout << "Partial fill test PASSED\n";

    return 0;
}
