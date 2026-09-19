#include "risk_manager.hpp"

#include <cassert>
#include <iostream>

int main() {

    hft::RiskLimits limits{
        100,       // max order quantity
        500,       // max position
        10000.0    // max notional
    };

    hft::RiskManager risk(limits);

    // ------------------------------------------------------------
    // 1. Normal valid order
    // ------------------------------------------------------------

    hft::Order validOrder(
        1,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        50
    );

    assert(
        risk.validateOrder(
            validOrder,
            0
        )
    );

    // ------------------------------------------------------------
    // 2. Order quantity limit
    // ------------------------------------------------------------

    hft::Order largeOrder(
        2,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        101
    );

    assert(
        !risk.validateOrder(
            largeOrder,
            0
        )
    );

    // ------------------------------------------------------------
    // 3. Current position limit
    // ------------------------------------------------------------

    hft::Order positionOrder(
        3,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        50
    );

    assert(
        !risk.validateOrder(
            positionOrder,
            500
        )
    );

    // ------------------------------------------------------------
    // 4. Pending BUY reservation should be rejected
    //
    // Current position = 450
    // Pending BUY     = 40
    // New BUY         = 20
    //
    // Projected       = 510 -> REJECT
    // ------------------------------------------------------------

    hft::Order pendingBuyOrder(
        4,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        20
    );

    assert(
        !risk.validateOrder(
            pendingBuyOrder,
            450,
            40
        )
    );

    // ------------------------------------------------------------
    // 5. Pending SELL can reduce projected long position
    //
    // Current position = 450
    // Pending SELL     = 40
    // New BUY          = 20
    //
    // Projected       = 430 -> ACCEPT
    // ------------------------------------------------------------

    hft::Order pendingSellOffsetOrder(
        5,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        20
    );

    assert(
        risk.validateOrder(
            pendingSellOffsetOrder,
            450,
            -40
        )
    );

    // ------------------------------------------------------------
    // 6. Pending SELL reservation should protect short limit
    //
    // Current position = -450
    // Pending SELL     = -40
    // New SELL         = -20
    //
    // Projected       = -510 -> REJECT
    // ------------------------------------------------------------

    hft::Order pendingShortOrder(
        6,
        hft::OrderSide::SELL,
        hft::OrderType::LIMIT,
        100.0,
        20
    );

    assert(
        !risk.validateOrder(
            pendingShortOrder,
            -450,
            -40
        )
    );

    // ------------------------------------------------------------
    // 7. Pending BUY can reduce projected short position
    //
    // Current position = -450
    // Pending BUY      = +40
    // New SELL         = -20
    //
    // Projected       = -430 -> ACCEPT
    // ------------------------------------------------------------

    hft::Order pendingBuyOffsetOrder(
        7,
        hft::OrderSide::SELL,
        hft::OrderType::LIMIT,
        100.0,
        20
    );

    assert(
        risk.validateOrder(
            pendingBuyOffsetOrder,
            -450,
            40
        )
    );

    // ------------------------------------------------------------
    // 8. Kill switch
    // ------------------------------------------------------------

    risk.setKillSwitch(true);

    assert(
        !risk.validateOrder(
            validOrder,
            0
        )
    );

    assert(risk.isKillSwitchEnabled());

    std::cout << "Risk Manager tests PASSED\n";
    std::cout << "Pending risk reservation tests PASSED\n";

    return 0;
}
