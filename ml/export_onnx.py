import joblib
from pathlib import Path

from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType


BASE_DIR = Path(__file__).resolve().parent

MODEL_FILE = BASE_DIR / "hft_ml_model.joblib"
OUTPUT_FILE = BASE_DIR / "hft_ml_model.onnx"


model = joblib.load(MODEL_FILE)

initial_type = [
    (
        "float_input",
        FloatTensorType([None, 4])
    )
]

onnx_model = convert_sklearn(
    model,
    initial_types=initial_type,
    options={
        id(model.named_steps["classifier"]): {
            "zipmap": False
        }
    }
)

with open(OUTPUT_FILE, "wb") as f:
    f.write(onnx_model.SerializeToString())

print(f"ONNX model saved to: {OUTPUT_FILE}")
