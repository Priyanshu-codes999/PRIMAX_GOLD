#include "trade_ledger.hpp"

#include <cassert>
#include <cmath>
#include <iostream>

int main() {

    hft::TradeLedger ledger;

    hft::TradeRecord trade1{
        1,
        hft::OrderSide::BUY,
        100.0,
        110.0,
        10,
        100.0,
        1000,
        2000
    };

    hft::TradeRecord trade2{
        2,
        hft::OrderSide::SELL,
        120.0,
        115.0,
        5,
        25.0,
        3000,
        4000
    };

    ledger.recordTrade(trade1);
    ledger.recordTrade(trade2);

    assert(ledger.size() == 2);

    assert(
        std::abs(
            ledger.totalRealizedPnL() - 125.0
        ) < 0.000001
    );

    assert(ledger.winningTrades() == 2);
    assert(ledger.losingTrades() == 0);

    const auto& trades = ledger.trades();

    assert(trades[0].entryPrice == 100.0);
    assert(trades[0].exitPrice == 110.0);
    assert(trades[0].quantity == 10);

    assert(trades[1].entryPrice == 120.0);
    assert(trades[1].exitPrice == 115.0);
    assert(trades[1].quantity == 5);

    std::cout << "Trade Ledger tests PASSED\n";

    return 0;
}
