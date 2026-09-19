#include "portfolio.hpp"

#include <cassert>
#include <cmath>
#include <iostream>

int main() {

    hft::Portfolio portfolio(10000.0);

    hft::Order buy(
        1,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        10
    );

    portfolio.processFill(
        buy,
        100.0,
        10
    );

    assert(portfolio.position() == 10);
    assert(
        std::abs(
            portfolio.cash() - 9000.0
        ) < 0.000001
    );

    portfolio.markToMarket(110.0);

    assert(
        std::abs(
            portfolio.unrealizedPnL() - 100.0
        ) < 0.000001
    );

    hft::Order sell(
        2,
        hft::OrderSide::SELL,
        hft::OrderType::LIMIT,
        110.0,
        10
    );

    portfolio.processFill(
        sell,
        110.0,
        10
    );

    assert(portfolio.position() == 0);

    assert(
        std::abs(
            portfolio.realizedPnL() - 100.0
        ) < 0.000001
    );

    assert(
        std::abs(
            portfolio.totalPnL() - 100.0
        ) < 0.000001
    );

    std::cout << "Portfolio tests PASSED\n";

    return 0;
}
