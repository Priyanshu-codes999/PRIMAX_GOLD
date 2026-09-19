#include "risk_manager.hpp"

namespace hft {

RiskManager::RiskManager(
    const RiskLimits& limits
)
    : limits_(limits),
      killSwitch_(false) {
}

bool RiskManager::validateOrder(
    const Order& order,
    std::int64_t currentPosition,
    std::int64_t pendingPosition
) const {

    if (killSwitch_) {
        return false;
    }

    if (order.quantity == 0) {
        return false;
    }

    if (order.quantity > limits_.max_order_quantity) {
        return false;
    }

    if (order.price <= 0.0) {
        return false;
    }

    const double notional =
        order.price *
        static_cast<double>(order.quantity);

    if (notional > limits_.max_notional) {
        return false;
    }

    /*
     * Position after this order AND all already-pending
     * exposure must remain within the configured limit.
     */
    std::int64_t orderPosition =
        static_cast<std::int64_t>(order.quantity);

    if (order.side == OrderSide::SELL) {
        orderPosition = -orderPosition;
    }

    const std::int64_t projectedPosition =
        currentPosition +
        pendingPosition +
        orderPosition;

    if (projectedPosition > limits_.max_position) {
        return false;
    }

    if (projectedPosition < -limits_.max_position) {
        return false;
    }

    return true;
}

void RiskManager::enableKillSwitch() {
    killSwitch_ = true;
}

void RiskManager::disableKillSwitch() {
    killSwitch_ = false;
}

void RiskManager::setKillSwitch(bool enabled) {
    killSwitch_ = enabled;
}

bool RiskManager::killSwitchEnabled() const {
    return killSwitch_;
}

bool RiskManager::isKillSwitchEnabled() const {
    return killSwitch_;
}

} // namespace hft
