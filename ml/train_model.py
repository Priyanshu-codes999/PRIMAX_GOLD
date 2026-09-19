import pandas as pd
import joblib
from pathlib import Path

from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    confusion_matrix,
)


BASE_DIR = Path(__file__).resolve().parent
DATASET = BASE_DIR.parent / "build" / "ml_training_data.csv"

FEATURES = [
    "imbalance",
    "momentum",
    "spread",
    "volatility",
]

TARGET = "label"

TEST_RATIO = 0.20


def main():

    df = pd.read_csv(DATASET)

    print("Dataset shape:", df.shape)

    print("\nLabel distribution:")
    print(df[TARGET].value_counts().sort_index())

    # ------------------------------------------------------------
    # Chronological split
    #
    # IMPORTANT:
    # No shuffle.
    #
    # Earlier observations -> training
    # Later observations  -> testing
    # ------------------------------------------------------------

    split_index = int(len(df) * (1.0 - TEST_RATIO))

    train_df = df.iloc[:split_index].copy()
    test_df = df.iloc[split_index:].copy()

    X_train = train_df[FEATURES]
    y_train = train_df[TARGET]

    X_test = test_df[FEATURES]
    y_test = test_df[TARGET]

    print("\nChronological Split:")
    print("------------------------------")
    print(f"Train rows: 0 -> {split_index - 1}")
    print(f"Test rows : {split_index} -> {len(df) - 1}")

    model = Pipeline([
        ("scaler", StandardScaler()),
        (
            "classifier",
            LogisticRegression(
                max_iter=1000,
                class_weight="balanced",
            ),
        ),
    ])

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    balanced_accuracy = balanced_accuracy_score(
        y_test,
        predictions
    )

    macro_f1 = f1_score(
        y_test,
        predictions,
        average="macro",
        zero_division=0,
    )

    print("\n==============================")
    print("HFT ML TIME-SERIES VALIDATION")
    print("==============================")

    print(f"Training samples   : {len(X_train)}")
    print(f"Testing samples    : {len(X_test)}")
    print(f"Accuracy            : {accuracy:.4f}")
    print(f"Balanced Accuracy   : {balanced_accuracy:.4f}")
    print(f"Macro F1            : {macro_f1:.4f}")

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            predictions,
            zero_division=0
        )
    )

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, predictions))

    print("\nSample Predictions:")
    print("------------------------------")

    for i in range(min(10, len(predictions))):

        predicted_label = predictions[i]

        confidence = probabilities[i].max()

        print(
            f"Prediction: {predicted_label:>2} "
            f"| Confidence: {confidence:.4f}"
        )

    MODEL_FILE = BASE_DIR / "hft_ml_model.joblib"

    joblib.dump(
        model,
        MODEL_FILE
    )

    print("\nModel saved to:", MODEL_FILE)

    classifier = model.named_steps["classifier"]

    print("Model Classes:")
    print(classifier.classes_)


if __name__ == "__main__":
    main()
