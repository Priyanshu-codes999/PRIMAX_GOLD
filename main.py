

@app.get("/api/market-ticks")
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
