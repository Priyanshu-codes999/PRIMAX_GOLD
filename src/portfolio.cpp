#include "portfolio.hpp"

#include <iostream>

namespace hft {

Portfolio::Portfolio(double initialCash)
    : initialCash_(initialCash),
      cash_(initialCash),
      unrealizedPnL_(0.0),
      feesPaid_(0.0),
      positionManager_() {
}

void Portfolio::processFill(
    const Order& order,
    double executionPrice,
    std::uint64_t quantity,
    double fee
) {

    if (quantity == 0) {
        return;
    }

    if (fee < 0.0) {
        fee = 0.0;
    }

    feesPaid_ += fee;

    const double value =
        executionPrice *
        static_cast<double>(quantity);

    // Cash movement belongs to Portfolio.
    if (order.side == OrderSide::BUY) {
        cash_ -= value;
    } else {
        cash_ += value;
    }

    cash_ -= fee;

    // Position and realized P&L belong to PositionManager.
    positionManager_.processFill(
        order,
        executionPrice,
        quantity
    );

    // If the position is fully closed,
    // there is no remaining unrealized P&L.
    if (positionManager_.position() == 0) {
        unrealizedPnL_ = 0.0;
    }
}

void Portfolio::markToMarket(
    double marketPrice
) {

    const std::int64_t currentPosition =
        positionManager_.position();

    const double entryPrice =
        positionManager_.averageEntryPrice();

    if (currentPosition > 0) {

        unrealizedPnL_ =
            (marketPrice - entryPrice) *
            static_cast<double>(
                currentPosition
            );

    } else if (currentPosition < 0) {

        unrealizedPnL_ =
            (entryPrice - marketPrice) *
            static_cast<double>(
                -currentPosition
            );

    } else {

        unrealizedPnL_ = 0.0;
    }
}

double Portfolio::cash() const {
    return cash_;
}

std::int64_t Portfolio::position() const {
    return positionManager_.position();
}

double Portfolio::averageEntryPrice() const {
    return positionManager_.averageEntryPrice();
}

double Portfolio::realizedPnL() const {
    return positionManager_.realizedPnL();
}

double Portfolio::unrealizedPnL() const {
    return unrealizedPnL_;
}

double Portfolio::totalPnL() const {

    return realizedPnL() +
           unrealizedPnL_ -
           feesPaid_;
}

double Portfolio::feesPaid() const {
    return feesPaid_;
}

void Portfolio::print() const {

    std::cout
        << "\n========== PORTFOLIO ==========\n";

    std::cout
        << "Cash              : "
        << cash_ << '\n';

    std::cout
        << "Position          : "
        << position() << '\n';

    std::cout
        << "Avg Entry Price   : "
        << averageEntryPrice() << '\n';

    std::cout
        << "Realized P&L      : "
        << realizedPnL() << '\n';

    std::cout
        << "Unrealized P&L    : "
        << unrealizedPnL_ << '\n';

    std::cout
        << "Fees Paid         : "
        << feesPaid_ << '\n';

    std::cout
        << "Total P&L         : "
        << totalPnL() << '\n';

    std::cout
        << "===============================\n";
}

} // namespace hft
