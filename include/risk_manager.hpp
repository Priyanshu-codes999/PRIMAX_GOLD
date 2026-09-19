#pragma once

#include "order.hpp"

#include <cstdint>

namespace hft {

struct RiskLimits {
    std::uint64_t max_order_quantity;
    std::int64_t max_position;
    double max_notional;
};

class RiskManager {
public:
    explicit RiskManager(const RiskLimits& limits);

    bool validateOrder(
        const Order& order,
        std::int64_t currentPosition,
        std::int64_t pendingPosition = 0
    ) const;

    void enableKillSwitch();
    void disableKillSwitch();
    void setKillSwitch(bool enabled);
    bool killSwitchEnabled() const;
    bool isKillSwitchEnabled() const;

private:
    RiskLimits limits_;
    bool killSwitch_;
};

} // namespace hft
