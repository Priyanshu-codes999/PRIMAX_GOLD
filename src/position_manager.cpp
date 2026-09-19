#include "position_manager.hpp"

#include <algorithm>

namespace hft {

PositionManager::PositionManager()
    : position_(0),
      averageEntryPrice_(0.0),
      realizedPnL_(0.0) {
}

PositionUpdate PositionManager::processFill(
    const Order& order,
    double executionPrice,
    std::uint64_t quantity
) {

    PositionUpdate update{};

    if (quantity == 0) {
        update.position = position_;
        update.averageEntryPrice =
            averageEntryPrice_;
        update.realizedPnL = realizedPnL_;
        update.closedQuantity = 0;

        return update;
    }

    const std::int64_t qty =
        static_cast<std::int64_t>(quantity);

    std::uint64_t closedQuantity = 0;

    if (order.side == OrderSide::BUY) {

        if (position_ >= 0) {

            const double oldValue =
                averageEntryPrice_ *
                static_cast<double>(position_);

            const double newValue =
                oldValue +
                executionPrice *
                static_cast<double>(quantity);

            position_ += qty;

            averageEntryPrice_ =
                newValue /
                static_cast<double>(position_);

        } else {

            closedQuantity =
                std::min(
                    quantity,
                    static_cast<std::uint64_t>(
                        -position_
                    )
                );

            realizedPnL_ +=
                (averageEntryPrice_ -
                 executionPrice) *
                static_cast<double>(
                    closedQuantity
                );

            position_ +=
                static_cast<std::int64_t>(
                    closedQuantity
                );

            const std::int64_t remaining =
                qty -
                static_cast<std::int64_t>(
                    closedQuantity
                );

            if (remaining > 0) {

                position_ = remaining;
                averageEntryPrice_ =
                    executionPrice;

            } else if (position_ == 0) {

                averageEntryPrice_ = 0.0;
            }
        }

    } else {

        if (position_ <= 0) {

            const double oldValue =
                averageEntryPrice_ *
                static_cast<double>(
                    -position_
                );

            const double newValue =
                oldValue +
                executionPrice *
                static_cast<double>(quantity);

            position_ -= qty;

            averageEntryPrice_ =
                newValue /
                static_cast<double>(
                    -position_
                );

        } else {

            closedQuantity =
                std::min(
                    quantity,
                    static_cast<std::uint64_t>(
                        position_
                    )
                );

            realizedPnL_ +=
                (executionPrice -
                 averageEntryPrice_) *
                static_cast<double>(
                    closedQuantity
                );

            position_ -=
                static_cast<std::int64_t>(
                    closedQuantity
                );

            const std::int64_t remaining =
                qty -
                static_cast<std::int64_t>(
                    closedQuantity
                );

            if (remaining > 0) {

                position_ = -remaining;
                averageEntryPrice_ =
                    executionPrice;

            } else if (position_ == 0) {

                averageEntryPrice_ = 0.0;
            }
        }
    }

    update.position = position_;

    update.averageEntryPrice =
        averageEntryPrice_;

    update.realizedPnL =
        realizedPnL_;

    update.closedQuantity =
        closedQuantity;

    return update;
}

std::int64_t PositionManager::position() const {
    return position_;
}

double PositionManager::averageEntryPrice() const {
    return averageEntryPrice_;
}

double PositionManager::realizedPnL() const {
    return realizedPnL_;
}

} // namespace hft
