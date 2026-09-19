#include "ml_dataset.hpp"

#include <cassert>
#include <iostream>

int main() {

    hft::MarketDataSimulator marketData("BTCUSDT");

    hft::MLDatasetGenerator generator;

    const auto dataset =
        generator.generate(
            marketData,
            10000,
            5,
            5.0
        );

    assert(dataset.size() == 10000);

    const bool saved =
        generator.saveCsv(
            dataset,
            "ml_training_data.csv"
        );

    assert(saved);

    std::cout << "ML Dataset samples : "
              << dataset.size() << '\n';

    std::cout << "First sample:\n";

    std::cout << "Imbalance         : "
              << dataset[0].imbalance << '\n';

    std::cout << "Momentum          : "
              << dataset[0].momentum << '\n';

    std::cout << "Spread            : "
              << dataset[0].spread << '\n';

    std::cout << "Volatility        : "
              << dataset[0].volatility << '\n';

    std::cout << "Future Return BPS : "
              << dataset[0].futureReturnBps << '\n';

    std::cout << "Label             : "
              << dataset[0].label << '\n';

    std::cout << "ML Dataset tests PASSED\n";

    return 0;
}
