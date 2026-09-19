import numpy as np
import onnxruntime as ort
from pathlib import Path


MODEL_FILE = Path(__file__).resolve().parent / "hft_ml_model.onnx"


session = ort.InferenceSession(
    str(MODEL_FILE),
    providers=["CPUExecutionProvider"]
)

input_name = session.get_inputs()[0].name

sample = np.array(
    [[0.42857143, 0.05, 0.10, 0.05]],
    dtype=np.float32
)

outputs = session.run(
    None,
    {input_name: sample}
)

print("Input:", sample)
print("Number of outputs:", len(outputs))

for i, output in enumerate(outputs):
    print(f"Output {i}:")
    print(output)
    print("Shape:", getattr(output, "shape", None))
