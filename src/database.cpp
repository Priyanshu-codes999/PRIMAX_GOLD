#include "database.hpp"
#include "market_data.hpp"
#include "order.hpp"

#include <libpq-fe.h>

#include <memory>
#include <stdexcept>
#include <string>

namespace hft {

class DatabaseManager::Impl {
public:
    explicit Impl(const std::string& connectionString) {
        connection = PQconnectdb(connectionString.c_str());

        if (connection == nullptr ||
            PQstatus(connection) != CONNECTION_OK) {
            std::string error =
                connection ? PQerrorMessage(connection)
                           : "Unable to allocate PostgreSQL connection";

            if (connection) {
                PQfinish(connection);
                connection = nullptr;
            }

            throw std::runtime_error(
                "PostgreSQL connection failed: " + error
            );
        }
    }

    ~Impl() {
        if (connection) {
            PQfinish(connection);
            connection = nullptr;
        }
    }

    PGconn* connection{nullptr};
};

DatabaseManager::DatabaseManager(const std::string& connectionString)
    : impl_(std::make_unique<Impl>(connectionString)) {}

DatabaseManager::~DatabaseManager() = default;

bool DatabaseManager::isConnected() const {
    return impl_ &&
           impl_->connection &&
           PQstatus(impl_->connection) == CONNECTION_OK;
}


bool DatabaseManager::isKillSwitchEnabled() {
    if (!impl_ || !impl_->connection) {
        return false;
    }

    const char* query = R"(
        SELECT enabled
        FROM system_controls
        WHERE control_name = 'kill_switch'
        LIMIT 1
    )";

    PGresult* result = PQexec(impl_->connection, query);

    if (PQresultStatus(result) != PGRES_TUPLES_OK) {
        PQclear(result);
        return false;
    }

    bool enabled = false;

    if (PQntuples(result) > 0) {
        enabled = std::string(PQgetvalue(result, 0, 0)) == "t";
    }

    PQclear(result);
    return enabled;
}

void DatabaseManager::insertMarketTick(const MarketTick& tick) {
    if (!isConnected()) {
        throw std::runtime_error(
            "PostgreSQL connection is not open"
        );
    }

    const std::string bidPrice = std::to_string(tick.bid_price);
    const std::string askPrice = std::to_string(tick.ask_price);
    const std::string bidQuantity = std::to_string(tick.bid_quantity);
    const std::string askQuantity = std::to_string(tick.ask_quantity);
    const std::string timestamp = std::to_string(tick.timestamp_ns);

    const char* values[] = {
        tick.symbol.c_str(),
        bidPrice.c_str(),
        askPrice.c_str(),
        bidQuantity.c_str(),
        askQuantity.c_str(),
        timestamp.c_str()
    };

    PGresult* result = PQexecParams(
        impl_->connection,
        "INSERT INTO market_ticks "
        "(symbol, bid_price, ask_price, bid_quantity, ask_quantity, timestamp_ns) "
        "VALUES ($1, $2, $3, $4, $5, $6)",
        6,
        nullptr,
        values,
        nullptr,
        nullptr,
        0
    );

    if (result == nullptr) {
        throw std::runtime_error(
            "PostgreSQL INSERT returned no result"
        );
    }

    const ExecStatusType status = PQresultStatus(result);

    if (status != PGRES_COMMAND_OK) {
        std::string error = PQresultErrorMessage(result);
        PQclear(result);

        throw std::runtime_error(
            "PostgreSQL INSERT failed: " + error
        );
    }

    PQclear(result);
}



bool DatabaseManager::getLatestMarketTick(MarketTick& tick) {
    if (!isConnected()) {
        return false;
    }

    const char* query = R"(
        SELECT symbol, bid_price, ask_price,
               bid_quantity, ask_quantity, timestamp_ns
        FROM market_ticks
        ORDER BY tick_id DESC
        LIMIT 1
    )";

    PGresult* result = PQexec(impl_->connection, query);

    if (result == nullptr) {
        return false;
    }

    if (PQresultStatus(result) != PGRES_TUPLES_OK ||
        PQntuples(result) == 0) {
        PQclear(result);
        return false;
    }

    try {
        tick.symbol = PQgetvalue(result, 0, 0);
        tick.bid_price = std::stod(PQgetvalue(result, 0, 1));
        tick.ask_price = std::stod(PQgetvalue(result, 0, 2));
        tick.bid_quantity =
            static_cast<std::uint64_t>(
                std::stoull(PQgetvalue(result, 0, 3))
            );
        tick.ask_quantity =
            static_cast<std::uint64_t>(
                std::stoull(PQgetvalue(result, 0, 4))
            );
        tick.timestamp_ns =
            static_cast<std::uint64_t>(
                std::stoull(PQgetvalue(result, 0, 5))
            );
    } catch (...) {
        PQclear(result);
        return false;
    }

    PQclear(result);
    return true;
}


void DatabaseManager::insertOrder(
    const Order& order,
    const std::string& symbol,
    const std::string& status
) {
    if (!isConnected()) {
        throw std::runtime_error(
            "PostgreSQL connection is not open"
        );
    }

    const std::string orderId = std::to_string(order.id);
    const std::string side =
        order.side == OrderSide::BUY ? "BUY" : "SELL";
    const std::string orderType =
        order.type == OrderType::MARKET ? "MARKET" : "LIMIT";
    const std::string price = std::to_string(order.price);
    const std::string quantity = std::to_string(order.quantity);

    const char* values[] = {
        orderId.c_str(),
        symbol.c_str(),
        side.c_str(),
        orderType.c_str(),
        price.c_str(),
        quantity.c_str(),
        status.c_str()
    };

    PGresult* result = PQexecParams(
        impl_->connection,
        "INSERT INTO orders "
        "(order_id, symbol, side, order_type, price, quantity, status) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7)",
        7,
        nullptr,
        values,
        nullptr,
        nullptr,
        0
    );

    if (result == nullptr) {
        throw std::runtime_error(
            "PostgreSQL order INSERT returned no result"
        );
    }

    const ExecStatusType statusCode = PQresultStatus(result);

    if (statusCode != PGRES_COMMAND_OK) {
        std::string error = PQresultErrorMessage(result);
        PQclear(result);

        throw std::runtime_error(
            "PostgreSQL order INSERT failed: " + error
        );
    }

    PQclear(result);
}


void DatabaseManager::insertExecution(
    std::uint64_t orderId,
    const std::string& symbol,
    const std::string& side,
    double executionPrice,
    std::uint64_t quantity,
    double fee,
    std::uint64_t latencyNs
) {
    if (!isConnected()) {
        throw std::runtime_error(
            "PostgreSQL connection is not open"
        );
    }

    const std::string orderIdStr = std::to_string(orderId);
    const std::string priceStr = std::to_string(executionPrice);
    const std::string quantityStr = std::to_string(quantity);
    const std::string feeStr = std::to_string(fee);
    const std::string latencyStr = std::to_string(latencyNs);

    const char* values[] = {
        orderIdStr.c_str(),
        symbol.c_str(),
        side.c_str(),
        priceStr.c_str(),
        quantityStr.c_str(),
        feeStr.c_str(),
        latencyStr.c_str()
    };

    PGresult* result = PQexecParams(
        impl_->connection,
        "INSERT INTO executions "
        "(order_id, symbol, side, execution_price, quantity, fee, latency_ns) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7)",
        7,
        nullptr,
        values,
        nullptr,
        nullptr,
        0
    );

    if (result == nullptr) {
        throw std::runtime_error(
            "PostgreSQL execution INSERT returned no result"
        );
    }

    const ExecStatusType statusCode = PQresultStatus(result);

    if (statusCode != PGRES_COMMAND_OK) {
        std::string error = PQresultErrorMessage(result);
        PQclear(result);

        throw std::runtime_error(
            "PostgreSQL execution INSERT failed: " + error
        );
    }

    PQclear(result);
}


void DatabaseManager::insertPortfolioSnapshot(
    double cash,
    std::int64_t position,
    double marketPrice,
    double realizedPnL,
    double unrealizedPnL,
    double feesPaid,
    double totalPnL
) {
    if (!isConnected()) {
        throw std::runtime_error(
            "PostgreSQL connection is not open"
        );
    }

    const std::string cashStr = std::to_string(cash);
    const std::string positionStr = std::to_string(position);
    const std::string marketPriceStr = std::to_string(marketPrice);
    const std::string realizedPnLStr = std::to_string(realizedPnL);
    const std::string unrealizedPnLStr = std::to_string(unrealizedPnL);
    const std::string feesStr = std::to_string(feesPaid);
    const std::string totalPnLStr = std::to_string(totalPnL);

    const char* values[] = {
        cashStr.c_str(),
        positionStr.c_str(),
        marketPriceStr.c_str(),
        realizedPnLStr.c_str(),
        unrealizedPnLStr.c_str(),
        feesStr.c_str(),
        totalPnLStr.c_str()
    };

    PGresult* result = PQexecParams(
        impl_->connection,
        "INSERT INTO portfolio_snapshots "
        "(cash, position, market_price, realized_pnl, "
        "unrealized_pnl, fees_paid, total_pnl) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7)",
        7,
        nullptr,
        values,
        nullptr,
        nullptr,
        0
    );

    if (result == nullptr) {
        throw std::runtime_error(
            "PostgreSQL portfolio snapshot INSERT returned no result"
        );
    }

    const ExecStatusType statusCode = PQresultStatus(result);

    if (statusCode != PGRES_COMMAND_OK) {
        std::string error = PQresultErrorMessage(result);
        PQclear(result);

        throw std::runtime_error(
            "PostgreSQL portfolio snapshot INSERT failed: " + error
        );
    }

    PQclear(result);
}


void DatabaseManager::upsertPosition(
    const std::string& symbol,
    std::int64_t quantity,
    double averageEntryPrice,
    double realizedPnL
) {
    if (!isConnected()) {
        throw std::runtime_error(
            "PostgreSQL connection is not open"
        );
    }

    const std::string quantityStr = std::to_string(quantity);
    const std::string avgPriceStr = std::to_string(averageEntryPrice);
    const std::string realizedPnLStr = std::to_string(realizedPnL);

    const char* values[] = {
        symbol.c_str(),
        quantityStr.c_str(),
        avgPriceStr.c_str(),
        realizedPnLStr.c_str()
    };

    PGresult* result = PQexecParams(
        impl_->connection,
        "INSERT INTO positions "
        "(symbol, quantity, average_entry_price, realized_pnl, updated_at) "
        "VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) "
        "ON CONFLICT (symbol) DO UPDATE SET "
        "quantity = EXCLUDED.quantity, "
        "average_entry_price = EXCLUDED.average_entry_price, "
        "realized_pnl = EXCLUDED.realized_pnl, "
        "updated_at = CURRENT_TIMESTAMP",
        4,
        nullptr,
        values,
        nullptr,
        nullptr,
        0
    );

    if (result == nullptr) {
        throw std::runtime_error(
            "PostgreSQL position UPSERT returned no result"
        );
    }

    const ExecStatusType statusCode = PQresultStatus(result);

    if (statusCode != PGRES_COMMAND_OK) {
        std::string error = PQresultErrorMessage(result);
        PQclear(result);

        throw std::runtime_error(
            "PostgreSQL position UPSERT failed: " + error
        );
    }

    PQclear(result);
}

} // namespace hft
