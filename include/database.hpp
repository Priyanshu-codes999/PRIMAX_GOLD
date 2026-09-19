#pragma once

#include <cstdint>
#include <memory>
#include <string>

namespace hft {

struct MarketTick;
struct Order;

class DatabaseManager {
public:
    explicit DatabaseManager(const std::string& connectionString);
    ~DatabaseManager();

    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;

    bool isConnected() const;
    bool isKillSwitchEnabled();

    void insertMarketTick(const MarketTick& tick);
    bool getLatestMarketTick(MarketTick& tick);

    void insertOrder(
        const Order& order,
        const std::string& symbol,
        const std::string& status
    );

    void insertExecution(
        std::uint64_t orderId,
        const std::string& symbol,
        const std::string& side,
        double executionPrice,
        std::uint64_t quantity,
        double fee,
        std::uint64_t latencyNs
    );

    void upsertPosition(
        const std::string& symbol,
        std::int64_t quantity,
        double averageEntryPrice,
        double realizedPnL
    );

    void insertPortfolioSnapshot(
        double cash,
        std::int64_t position,
        double marketPrice,
        double realizedPnL,
        double unrealizedPnL,
        double feesPaid,
        double totalPnL
    );

private:
    class Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace hft
