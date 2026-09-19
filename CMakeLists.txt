cmake_minimum_required(VERSION 3.20)

project(FinancialEngine
    VERSION 1.0
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(hft_engine
    src/main.cpp
    src/order_book.cpp
    src/market_data.cpp
    src/strategy.cpp
    src/risk_manager.cpp
    src/oms.cpp
    src/execution.cpp
    src/exchange_simulator.cpp
    src/portfolio.cpp
    src/backtest.cpp
    src/performance.cpp
    src/trade_ledger.cpp
    src/position_manager.cpp
    src/features.cpp
    src/strategy_v2.cpp
    src/ml_dataset.cpp
    src/ml_inference.cpp
    src/ml_strategy.cpp
    src/database.cpp
)

target_include_directories(hft_engine
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
        ${PROJECT_SOURCE_DIR}/onnxruntime-linux-x64-1.22.0/include
)

find_package(PostgreSQL REQUIRED)

target_link_libraries(hft_engine
    PRIVATE
        PostgreSQL::PostgreSQL
)

target_link_libraries(hft_engine
    PRIVATE
        PostgreSQL::PostgreSQL
)

target_compile_options(hft_engine
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
)

enable_testing()

add_executable(test_order_book
    tests/test_order_book.cpp
    src/order_book.cpp
)

target_include_directories(test_order_book
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

add_test(
    NAME OrderBookTest
    COMMAND test_order_book
)


add_executable(test_risk_manager
    tests/test_risk_manager.cpp
    src/risk_manager.cpp
)

target_include_directories(test_risk_manager
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

add_test(
    NAME RiskManagerTest
    COMMAND test_risk_manager
)


add_executable(test_oms
    tests/test_oms.cpp
    src/oms.cpp
)

target_include_directories(test_oms
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

add_test(
    NAME OMSTest
    COMMAND test_oms
)


add_executable(test_portfolio
    tests/test_portfolio.cpp
    src/portfolio.cpp
    src/position_manager.cpp
)

target_include_directories(test_portfolio
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

target_compile_options(test_portfolio
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
)

add_test(
    NAME PortfolioTest
    COMMAND test_portfolio
)

add_executable(latency_benchmark
    tests/latency_benchmark.cpp
    src/benchmark.cpp
    src/market_data.cpp
    src/order_book.cpp
    src/strategy.cpp
    src/risk_manager.cpp
    src/execution.cpp
    src/exchange_simulator.cpp
)

target_include_directories(latency_benchmark
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

target_compile_options(latency_benchmark
    PRIVATE
        -O2
        -Wall
        -Wextra
        -Wpedantic
)

add_executable(test_position_manager
    tests/test_position_manager.cpp
    src/position_manager.cpp
)

target_include_directories(test_position_manager
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

target_compile_options(test_position_manager
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
)

add_test(
    NAME PositionManagerTest
    COMMAND test_position_manager
)

add_executable(test_trade_ledger
    tests/test_trade_ledger.cpp
    src/trade_ledger.cpp
)

target_include_directories(test_trade_ledger
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

target_compile_options(test_trade_ledger
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
)

add_test(
    NAME TradeLedgerTest
    COMMAND test_trade_ledger
)

add_executable(test_strategy_v2
    tests/test_strategy_v2.cpp
    src/strategy_v2.cpp
)

target_include_directories(
    test_strategy_v2
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

target_compile_options(
    test_strategy_v2
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
)

add_test(
    NAME StrategyV2Test
    COMMAND test_strategy_v2
)

add_executable(test_ml_dataset
    tests/test_ml_dataset.cpp
    src/ml_dataset.cpp
    src/features.cpp
    src/market_data.cpp
    src/order_book.cpp
)

target_include_directories(
    test_ml_dataset
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

target_compile_options(
    test_ml_dataset
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
)

add_test(
    NAME MLDatasetTest
    COMMAND test_ml_dataset
)

# ONNX Runtime C++ integration
set(ONNXRUNTIME_ROOT
    ${PROJECT_SOURCE_DIR}/onnxruntime-linux-x64-1.22.0
)

target_include_directories(
    hft_engine
    PRIVATE
        ${ONNXRUNTIME_ROOT}/include
)

target_link_directories(
    hft_engine
    PRIVATE
        ${ONNXRUNTIME_ROOT}/lib
)

target_link_libraries(
    hft_engine
    PRIVATE
        ${ONNXRUNTIME_ROOT}/lib/libonnxruntime.so
)

set_target_properties(
    hft_engine
    PROPERTIES
        BUILD_RPATH
        "${ONNXRUNTIME_ROOT}/lib"
)

add_executable(test_ml_inference
    tests/test_ml_inference.cpp
    src/ml_inference.cpp
)

target_include_directories(
    test_ml_inference
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
        ${PROJECT_SOURCE_DIR}/onnxruntime-linux-x64-1.22.0/include
)

target_link_libraries(
    test_ml_inference
    PRIVATE
        ${PROJECT_SOURCE_DIR}/onnxruntime-linux-x64-1.22.0/lib/libonnxruntime.so
)

set_target_properties(
    test_ml_inference
    PROPERTIES
        BUILD_RPATH
        "${PROJECT_SOURCE_DIR}/onnxruntime-linux-x64-1.22.0/lib"
)

target_compile_options(
    test_ml_inference
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
)

add_test(
    NAME MLInferenceTest
    COMMAND test_ml_inference
)

add_executable(test_database
    tests/test_database.cpp
    src/database.cpp
    src/market_data.cpp
    src/exchange_simulator.cpp
)

target_include_directories(test_database
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
)

target_link_libraries(test_database
    PRIVATE
        PostgreSQL::PostgreSQL
)

add_test(
    NAME DatabaseTest
    COMMAND test_database
)
