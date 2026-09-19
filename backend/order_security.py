from pydantic import BaseModel, Field, field_validator
from typing import Literal


class SecureOrderRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    side: Literal["BUY", "SELL"]
    order_type: Literal["MARKET", "LIMIT"]
    price: float = Field(gt=0, le=10_000_000)
    quantity: int = Field(gt=0, le=1_000_000)

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, value: str) -> str:
        value = value.strip().upper()

        if not value.isalnum():
            raise ValueError("Invalid symbol")

        return value
