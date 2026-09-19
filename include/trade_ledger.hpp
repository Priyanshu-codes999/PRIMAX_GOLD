#pragma once

#include "trade.hpp"

#include <cstdint>
#include <vector>

namespace hft {

class TradeLedger {
public:
    void recordTrade(
        const TradeRecord& trade
    );

    std::size_t size() const;

    const std::vector<TradeRecord>& trades() const;

    double totalRealizedPnL() const;

    std::uint64_t winningTrades() const;

    std::uint64_t losingTrades() const;

    void printSummary() const;

private:
    std::vector<TradeRecord> trades_;
};

} // namespace hft
