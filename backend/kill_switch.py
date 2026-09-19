import os
import psycopg

DB_CONFIG = {
    "host": "172.30.48.1",
    "port": 5432,
    "dbname": "HFT_ENGINE",
    "user": "postgres",
    "password": os.getenv("HFT_DB_PASSWORD", ""),
}


def set_kill_switch(enabled: bool):
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO system_controls (control_name, enabled, updated_at)
                VALUES ('kill_switch', %s, CURRENT_TIMESTAMP)
                ON CONFLICT (control_name)
                DO UPDATE SET
                    enabled = EXCLUDED.enabled,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (enabled,),
            )


def is_kill_switch_enabled() -> bool:
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT enabled
                FROM system_controls
                WHERE control_name = 'kill_switch'
                """
            )
            row = cur.fetchone()
            return bool(row[0]) if row else False


def enable_kill_switch():
    set_kill_switch(True)


def disable_kill_switch():
    set_kill_switch(False)
