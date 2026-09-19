#include "order_book.hpp"

#include <cassert>
#include <iostream>

int main() {

    hft::OrderBook book;

    hft::Order buyOrder(
        1,
        hft::OrderSide::BUY,
        hft::OrderType::LIMIT,
        100.0,
        50
    );

    hft::Order sellOrder(
        2,
        hft::OrderSide::SELL,
        hft::OrderType::LIMIT,
        101.0,
        30
    );

    assert(book.addOrder(buyOrder));
    assert(book.addOrder(sellOrder));

    assert(book.bestBid().has_value());
    assert(book.bestAsk().has_value());

    assert(*book.bestBid() == 100.0);
    assert(*book.bestAsk() == 101.0);

    assert(book.bidVolume() == 50);
    assert(book.askVolume() == 30);

    assert(book.spread() == 1.0);

    assert(!book.addOrder(buyOrder));

    assert(book.cancelOrder(1));
    assert(!book.bestBid().has_value());

    std::cout << "Order Book tests PASSED\n";

    return 0;
}
