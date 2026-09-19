#include "ml_inference.hpp"

#include <onnxruntime_cxx_api.h>

#include <algorithm>
#include <array>
#include <memory>
#include <stdexcept>
#include <string>

namespace hft {

class MLInferenceEngine::Impl {
public:
    explicit Impl(const std::string& modelPath)
        : env(ORT_LOGGING_LEVEL_WARNING, "HFT_ML"),
          sessionOptions(),
          session(nullptr) {

        sessionOptions.SetIntraOpNumThreads(1);
        sessionOptions.SetInterOpNumThreads(1);

        sessionOptions.SetGraphOptimizationLevel(
            GraphOptimizationLevel::ORT_ENABLE_ALL
        );

        session = std::make_unique<Ort::Session>(
            env,
            modelPath.c_str(),
            sessionOptions
        );

        Ort::AllocatorWithDefaultOptions allocator;

        auto inputName =
            session->GetInputNameAllocated(0, allocator);

        auto outputName0 =
            session->GetOutputNameAllocated(0, allocator);

        auto outputName1 =
            session->GetOutputNameAllocated(1, allocator);

        inputName_ = inputName.get();
        outputName0_ = outputName0.get();
        outputName1_ = outputName1.get();
    }

    MLPrediction predict(
        const MarketFeatures& features
    ) {

        std::array<float, 4> inputData{
            static_cast<float>(features.imbalance),
            static_cast<float>(features.momentum),
            static_cast<float>(features.spread),
            static_cast<float>(features.volatility)
        };

        std::array<int64_t, 2> inputShape{1, 4};

        auto memoryInfo =
            Ort::MemoryInfo::CreateCpu(
                OrtArenaAllocator,
                OrtMemTypeDefault
            );

        Ort::Value inputTensor =
            Ort::Value::CreateTensor<float>(
                memoryInfo,
                inputData.data(),
                inputData.size(),
                inputShape.data(),
                inputShape.size()
            );

        const char* inputNames[] = {
            inputName_.c_str()
        };

        const char* outputNames[] = {
            outputName0_.c_str(),
            outputName1_.c_str()
        };

        auto outputs = session->Run(
            Ort::RunOptions{nullptr},
            inputNames,
            &inputTensor,
            1,
            outputNames,
            2
        );

        /*
         * Output 0:
         * predicted class
         *
         * -1 = SELL
         *  0 = HOLD
         *  1 = BUY
         */

        const int64_t predictedSignal =
            outputs[0].GetTensorData<int64_t>()[0];

        /*
         * Output 1:
         *
         * [P(SELL), P(HOLD), P(BUY)]
         */

        const float* probabilities =
            outputs[1].GetTensorData<float>();

        const double sellProbability =
            static_cast<double>(probabilities[0]);

        const double holdProbability =
            static_cast<double>(probabilities[1]);

        const double buyProbability =
            static_cast<double>(probabilities[2]);

        const double confidence =
            std::max({
                sellProbability,
                holdProbability,
                buyProbability
            });

        return MLPrediction{
            static_cast<int>(predictedSignal),
            confidence,
            sellProbability,
            holdProbability,
            buyProbability
        };
    }

private:
    Ort::Env env;
    Ort::SessionOptions sessionOptions;
    std::unique_ptr<Ort::Session> session;

    std::string inputName_;
    std::string outputName0_;
    std::string outputName1_;
};


MLInferenceEngine::MLInferenceEngine(
    const std::string& modelPath
)
    : impl_(new Impl(modelPath)) {
}


MLPrediction MLInferenceEngine::predict(
    const MarketFeatures& features
) {
    return impl_->predict(features);
}

} // namespace hft
