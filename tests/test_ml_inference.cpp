#include "ml_inference.hpp"

#include <cassert>
#include <cmath>
#include <iostream>

int main() {

    const std::string modelPath =
        "../ml/hft_ml_model.onnx";

    hft::MLInferenceEngine engine(modelPath);

    hft::MarketFeatures features{
        0.42857143,
        0.05,
        0.10,
        0.05
    };

    const hft::MLPrediction prediction =
        engine.predict(features);

    std::cout << "\n==============================\n";
    std::cout << "C++ ML INFERENCE TEST\n";
    std::cout << "==============================\n";

    std::cout << "Signal       : "
              << prediction.signal << '\n';

    std::cout << "SELL         : "
              << prediction.sellProbability << '\n';

    std::cout << "HOLD         : "
              << prediction.holdProbability << '\n';

    std::cout << "BUY          : "
              << prediction.buyProbability << '\n';

    std::cout << "Confidence   : "
              << prediction.confidence << '\n';

    assert(
        prediction.signal == -1 ||
        prediction.signal == 0 ||
        prediction.signal == 1
    );

    assert(prediction.sellProbability >= 0.0);
    assert(prediction.holdProbability >= 0.0);
    assert(prediction.buyProbability >= 0.0);

    const double probabilitySum =
        prediction.sellProbability +
        prediction.holdProbability +
        prediction.buyProbability;

    assert(std::abs(probabilitySum - 1.0) < 0.001);

    std::cout << "\nC++ ML Inference tests PASSED\n";

    return 0;
}
