from fastapi import FastAPI, Depends, HTTPException
from auth import require_api_key
from rate_limiter import rate_limit
from kill_switch import enable_kill_switch, disable_kill_switch, is_kill_switch_enabled
import psycopg

app = FastAPI(
    title="HFT Financial Engine API",
    version="1.0.0"
)

DB_CONFIG = {
    "host": "172.30.48.1",
    "port": 5432,
    "dbname": "HFT_ENGINE",
    "user": "postgres",
    "password": "priyanshu1234",
}


@app.get("/")
def root():
    return {
        "service": "HFT Financial Engine API",
        "status": "running"
    }


@app.get("/api/health")
def health():
    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT current_database()")
                database = cur.fetchone()[0]

        return {
            "status": "healthy",
            "database": database
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.post(
    "/api/security/kill-switch/enable",
    dependencies=[Depends(require_api_key), Depends(rate_limit)]
)
def enable_trading_kill_switch():
    enable_kill_switch()
    return {
        "kill_switch": "ENABLED",
        "trading": "HALTED"
    }


@app.post(
    "/api/security/kill-switch/disable",
    dependencies=[Depends(require_api_key), Depends(rate_limit)]
)
def disable_trading_kill_switch():
    disable_kill_switch()
    return {
        "kill_switch": "DISABLED",
        "trading": "ACTIVE"
    }


@app.get(
    "/api/security/kill-switch",
    dependencies=[Depends(require_api_key), Depends(rate_limit)]
)
def kill_switch_status():
    return {
        "kill_switch": "ENABLED" if is_kill_switch_enabled() else "DISABLED",
        "trading": "HALTED" if is_kill_switch_enabled() else "ACTIVE"
    }


@app.get("/api/market-ticks", dependencies=[Depends(require_api_key), Depends(rate_limit)])
def get_market_ticks(limit: int = 20):
    limit = max(1, min(limit, 500))

    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        tick_id,
                        symbol,
                        bid_price,
                        ask_price,
                        bid_quantity,
                        ask_quantity,
                        timestamp_ns,
                        created_at
                    FROM market_ticks
                    ORDER BY tick_id DESC
                    LIMIT %s
                    """,
                    (limit,)
                )

                rows = cur.fetchall()

        return [
            {
                "tick_id": row[0],
                "symbol": row[1],
                "bid_price": float(row[2]),
                "ask_price": float(row[3]),
                "bid_quantity": row[4],
                "ask_quantity": row[5],
                "timestamp_ns": row[6],
                "created_at": row[7],
            }
            for row in rows
        ]

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


@app.get("/api/orders", dependencies=[Depends(require_api_key), Depends(rate_limit)])
def get_orders(limit: int = 20):
    limit = max(1, min(limit, 500))

    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        order_id,
                        symbol,
                        side,
                        order_type,
                        price,
                        quantity,
                        status,
                        strategy_id,
                        created_at
                    FROM orders
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (limit,)
                )

                rows = cur.fetchall()

        return [
            {
                "order_id": row[0],
                "symbol": row[1],
                "side": row[2],
                "order_type": row[3],
                "price": float(row[4]),
                "quantity": row[5],
                "status": row[6],
                "strategy_id": row[7],
                "snapshot_at": row[8],
            }
            for row in rows
        ]

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


@app.get("/api/executions", dependencies=[Depends(require_api_key), Depends(rate_limit)])
def get_executions(limit: int = 20):
    limit = max(1, min(limit, 500))

    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        execution_id,
                        order_id,
                        symbol,
                        side,
                        execution_price,
                        quantity,
                        fee,
                        latency_ns,
                        executed_at
                    FROM executions
                    ORDER BY execution_id DESC
                    LIMIT %s
                    """,
                    (limit,)
                )

                rows = cur.fetchall()

        return [
            {
                "execution_id": row[0],
                "order_id": row[1],
                "symbol": row[2],
                "side": row[3],
                "execution_price": float(row[4]),
                "quantity": row[5],
                "fee": float(row[6]),
                "latency_ns": row[7],
                "executed_at": row[8],
            }
            for row in rows
        ]

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


@app.get("/api/positions", dependencies=[Depends(require_api_key), Depends(rate_limit)])
def get_positions():
    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        position_id,
                        symbol,
                        quantity,
                        average_entry_price,
                        realized_pnl,
                        updated_at
                    FROM positions
                    ORDER BY updated_at DESC
                    """
                )

                rows = cur.fetchall()

        return [
            {
                "position_id": row[0],
                "symbol": row[1],
                "quantity": row[2],
                "average_entry_price": float(row[3]),
                "realized_pnl": float(row[4]),
                "updated_at": row[5],
            }
            for row in rows
        ]

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/api/portfolio", dependencies=[Depends(require_api_key), Depends(rate_limit)])
def get_portfolio(limit: int = 20):
    limit = max(1, min(limit, 500))
    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT snapshot_id, cash, position, market_price,
                           realized_pnl, unrealized_pnl, fees_paid,
                           total_pnl, snapshot_at
                    FROM portfolio_snapshots
                    ORDER BY snapshot_id DESC
                    LIMIT %s
                    """,
                    (limit,)
                )
                rows = cur.fetchall()

        return [
            {
                "snapshot_id": row[0],
                "cash": float(row[1]),
                "position": row[2],
                "market_price": float(row[3]),
                "realized_pnl": float(row[4]),
                "unrealized_pnl": float(row[5]),
                "fees_paid": float(row[6]),
                "total_pnl": float(row[7]),
                "snapshot_at": row[8],
            }
            for row in rows
        ]

    except Exception as e:
        return {"status": "error", "error": str(e)}

from fastapi import WebSocket, WebSocketDisconnect
import asyncio
from datetime import datetime, timezone

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            try:
                with psycopg.connect(**DB_CONFIG) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            SELECT symbol, bid_price, ask_price,
                                   bid_quantity, ask_quantity, timestamp_ns
                            FROM market_ticks
                            ORDER BY tick_id DESC
                            LIMIT 1
                            """
                        )
                        row = cur.fetchone()

                if row:
                    await websocket.send_json({
                        "type": "market_tick",
                        "symbol": row[0],
                        "bid_price": float(row[1]),
                        "ask_price": float(row[2]),
                        "bid_quantity": row[3],
                        "ask_quantity": row[4],
                        "timestamp_ns": row[5],
                        "server_time": datetime.now(timezone.utc).isoformat()
                    })

                await asyncio.sleep(1)

            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
                await asyncio.sleep(2)

    except WebSocketDisconnect:
        print("WebSocket client disconnected")

from pydantic import BaseModel, Field

class LiveTickRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    time_msc: int
    bid: float = Field(gt=0)
    ask: float = Field(gt=0)
    last: float = Field(default=0, ge=0)
    volume: int = Field(default=0, ge=0)
    volume_real: float = Field(default=0, ge=0)


@app.post("/api/market/live-tick")
def receive_live_tick(tick: LiveTickRequest):
    if tick.ask < tick.bid:
        raise HTTPException(
            status_code=400,
            detail="Ask price cannot be lower than bid price"
        )

    timestamp_ns = tick.time_msc * 1_000_000

    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO market_ticks
                    (
                        symbol,
                        bid_price,
                        ask_price,
                        bid_quantity,
                        ask_quantity,
                        timestamp_ns
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        tick.symbol,
                        tick.bid,
                        tick.ask,
                        tick.volume,
                        tick.volume,
                        timestamp_ns,
                    ),
                )

        return {
            "status": "accepted",
            "symbol": tick.symbol,
            "bid": tick.bid,
            "ask": tick.ask,
            "timestamp_ns": timestamp_ns,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store market tick: {str(e)}"
        )
