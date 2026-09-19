# PRIMAX GOLD

## Quantitative Trading & Financial Intelligence Platform

PRIMAX GOLD is a research-oriented quantitative trading platform designed to combine **high-performance C++ trading components, machine learning, real-time market data, risk management, database persistence, and a React-based trading dashboard** into a single system.

The project is being developed as an end-to-end **paper-trading and algorithmic trading research platform**, with a focus on financial engineering, low-latency systems, ML-driven decision making, and secure trading infrastructure.

> **Current status:** Core HFT engine, ML pipeline, backend, database integration, and dashboard are implemented. Real-time MT5 XAUUSD integration is currently being connected to the ML and paper-trading pipeline.

---

## Architecture

```text
                         PRIMAX GOLD
                              │
                              ▼
                    ┌──────────────────┐
                    │   Market Data    │
                    │ MT5 / Simulator  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Feature Engine   │
                    │ Imbalance        │
                    │ Momentum         │
                    │ Spread           │
                    │ Volatility       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   ML Strategy    │
                    │ BUY / SELL / HOLD│
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Risk Manager    │
                    │ Limits / Checks  │
                    │ Kill Switch      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │       OMS        │
                    │ Order Management │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    Execution     │
                    │ Paper Exchange   │
                    └────────┬─────────┘
                             │
                             ▼
                  ┌───────────────────────┐
                  │ Position / Portfolio  │
                  │ P&L / Risk Metrics   │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ PostgreSQL + FastAPI  │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   PRIMAX GOLD UI      │
                  │ React + TypeScript    │
                  └───────────────────────┘
