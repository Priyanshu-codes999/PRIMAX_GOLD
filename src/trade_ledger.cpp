#include "trade_ledger.hpp"

#include <iostream>

namespace hft {

void TradeLedger::recordTrade(
    const TradeRecord& trade
) {
    trades_.push_back(trade);
}

std::size_t TradeLedger::size() const {
    return trades_.size();
}

const std::vector<TradeRecord>&
TradeLedger::trades() const {
    return trades_;
}

double TradeLedger::totalRealizedPnL() const {

    double total = 0.0;

    for (const auto& trade : trades_) {
        total += trade.realizedPnL;
    }

    return total;
}

std::uint64_t TradeLedger::winningTrades() const {

    std::uint64_t count = 0;

    for (const auto& trade : trades_) {

        if (trade.realizedPnL > 0.0) {
            ++count;
        }
    }

    return count;
}

std::uint64_t TradeLedger::losingTrades() const {

    std::uint64_t count = 0;

    for (const auto& trade : trades_) {

        if (trade.realizedPnL < 0.0) {
            ++count;
        }
    }

    return count;
}

void TradeLedger::printSummary() const {

    std::cout
        << "\n========== TRADE LEDGER ==========\n";

    std::cout
        << "Completed Trades : "
        << size() << '\n';

    std::cout
        << "Winning Trades   : "
        << winningTrades() << '\n';

    std::cout
        << "Losing Trades    : "
        << losingTrades() << '\n';

    std::cout
        << "Realized P&L     : "
        << totalRealizedPnL() << '\n';

    std::cout
        << "==================================\n";
}

} // namespace hft
