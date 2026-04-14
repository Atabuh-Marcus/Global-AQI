from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import json

app = FastAPI(
    title="Global AQI Prediction API",
    description="Predict Air Quality Index (AQI) class using a trained RandomForestClassifier",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model, preprocessor, and metadata at startup
model = joblib.load("rf_classifier.joblib")
preprocessor = joblib.load("preprocessor.joblib")

with open("model_metadata.json") as f:
    metadata = json.load(f)

VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

AQI_CLASS_INFO = {
    "Good": {
        "color": "#00e400",
        "range": "0–50",
        "description": "Air quality is satisfactory and poses little or no risk.",
        "advice": "Great day to be active outdoors.",
        "sensitive_advice": "Great day to be active outdoors.",
    },
    "Moderate": {
        "color": "#ffff00",
        "range": "51–100",
        "description": "Air quality is acceptable. Some pollutants may be a concern for a small number of sensitive people.",
        "advice": "Unusually sensitive people should consider reducing prolonged outdoor exertion.",
        "sensitive_advice": "Consider reducing prolonged outdoor exertion. Watch for symptoms such as coughing or shortness of breath.",
    },
    "Unhealthy for Sensitive": {
        "color": "#ff7e00",
        "range": "101–150",
        "description": "Members of sensitive groups may experience health effects. The general public is less likely to be affected.",
        "advice": "Reduce prolonged or heavy outdoor exertion. Take more breaks during outdoor activities.",
        "sensitive_advice": "Avoid prolonged or heavy outdoor exertion. Move activities indoors or reschedule.",
    },
    "Unhealthy": {
        "color": "#ff0000",
        "range": "151–200",
        "description": "Everyone may begin to experience health effects. Members of sensitive groups may experience more serious effects.",
        "advice": "Avoid prolonged or heavy outdoor exertion. Consider moving activities indoors.",
        "sensitive_advice": "Avoid all outdoor exertion. Remain indoors with windows closed.",
    },
    "Hazardous": {
        "color": "#7e0023",
        "range": "301+",
        "description": "Health warnings of emergency conditions. The entire population is likely to be affected.",
        "advice": "Avoid all outdoor activities. Stay indoors, close windows and doors, use air purifiers if available.",
        "sensitive_advice": "Remain indoors with windows closed. Use air purifiers. Seek medical attention if symptoms appear.",
    },
}

FEATURE_DISPLAY_NAMES = {
    "PM2.5": "PM2.5 (Fine Particles)",
    "PM10": "PM10 (Coarse Particles)",
    "NO2": "NO2 (Nitrogen Dioxide)",
    "SO2": "SO2 (Sulfur Dioxide)",
    "CO": "CO (Carbon Monoxide)",
    "Ozone": "Ozone",
    "Aerosol_Optical_Depth": "Aerosol Optical Depth",
    "Latitude": "Latitude",
    "Longitude": "Longitude",
    "City": "City",
    "DayOfWeek": "Day of Week",
}


# ─── Shared helpers ────────────────────────────────────────────────────────────

def _build_row(req) -> dict:
    return {
        "City": req.City,
        "DayOfWeek": req.DayOfWeek,
        "Latitude": req.Latitude,
        "Longitude": req.Longitude,
        "PM2.5": req.PM2_5,
        "PM10": req.PM10,
        "NO2": req.NO2,
        "SO2": req.SO2,
        "CO": req.CO,
        "Ozone": req.Ozone,
        "Aerosol_Optical_Depth": req.Aerosol_Optical_Depth,
    }


def _validate_day(day: str, index: int = None):
    if day not in VALID_DAYS:
        prefix = f"Item {index}: " if index is not None else ""
        raise HTTPException(status_code=422, detail=f"{prefix}DayOfWeek must be one of {VALID_DAYS}")


def _run_predict(df: pd.DataFrame):
    X = preprocessor.transform(df)
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)
    return predictions, probabilities


# ─── Schemas ───────────────────────────────────────────────────────────────────

class AQIPredictionRequest(BaseModel):
    City: str
    DayOfWeek: str
    Latitude: float
    Longitude: float
    PM2_5: float
    PM10: float
    NO2: float
    SO2: float
    CO: float
    Ozone: float
    Aerosol_Optical_Depth: float

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "City": "Lahore, Pakistan",
                    "DayOfWeek": "Monday",
                    "Latitude": 31.5497,
                    "Longitude": 74.3436,
                    "PM2_5": 85.0,
                    "PM10": 120.0,
                    "NO2": 40.0,
                    "SO2": 15.0,
                    "CO": 1.2,
                    "Ozone": 55.0,
                    "Aerosol_Optical_Depth": 0.8,
                }
            ]
        }
    }


class AQIPredictionResponse(BaseModel):
    predicted_class: str
    probabilities: dict[str, float]


class FeatureContribution(BaseModel):
    feature: str
    importance: float


class ExplainResponse(BaseModel):
    predicted_class: str
    probabilities: dict[str, float]
    top_features: list[FeatureContribution]


class CompareRequest(BaseModel):
    location_a: AQIPredictionRequest
    location_b: AQIPredictionRequest


class CompareResult(BaseModel):
    location: str
    predicted_class: str
    probabilities: dict[str, float]
    aqi_color: str


class CompareResponse(BaseModel):
    results: list[CompareResult]
    cleaner_location: str
    summary: str


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Global AQI Prediction API v2", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# 1. Model info
@app.get("/model/info", tags=["Model"])
def model_info():
    """
    Returns model metadata: type, version, feature names, and target classes.
    """
    return {
        "model_type": type(model).__name__,
        "api_version": "2.0.0",
        "n_estimators": model.n_estimators,
        "categorical_features": metadata["categorical_features"],
        "numerical_features": metadata["numerical_features"],
        "target_classes": metadata["classes"],
        "total_features": len(metadata["categorical_features"]) + len(metadata["numerical_features"]),
    }


# 2. AQI class reference
@app.get("/aqi/classes", tags=["AQI Reference"])
def aqi_classes():
    """
    Returns all AQI classes with descriptions, AQI ranges, color codes, and health guidance.
    """
    return {
        cls: {
            "color": info["color"],
            "aqi_range": info["range"],
            "description": info["description"],
        }
        for cls, info in AQI_CLASS_INFO.items()
    }


# 3. Health advice per AQI class
@app.get("/health/advice/{aqi_class}", tags=["AQI Reference"])
def health_advice(aqi_class: str):
    """
    Returns health recommendations and safety guidance for a given AQI class.
    """
    # Case-insensitive lookup
    match = next((k for k in AQI_CLASS_INFO if k.lower() == aqi_class.lower()), None)
    if not match:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown AQI class '{aqi_class}'. Valid classes: {list(AQI_CLASS_INFO.keys())}",
        )
    info = AQI_CLASS_INFO[match]
    return {
        "aqi_class": match,
        "color": info["color"],
        "aqi_range": info["range"],
        "description": info["description"],
        "general_advice": info["advice"],
        "sensitive_groups_advice": info["sensitive_advice"],
    }


# 4. Predict with feature explanation
@app.post("/predict/explain", response_model=ExplainResponse, tags=["Prediction"])
def predict_explain(request: AQIPredictionRequest):
    """
    Returns prediction, class probabilities, and the top 5 features that drove the result
    (based on the RandomForest's global feature importances).
    """
    _validate_day(request.DayOfWeek)

    df = pd.DataFrame([_build_row(request)])
    X = preprocessor.transform(df)

    prediction = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]
    class_probs = {cls: round(float(p), 4) for cls, p in zip(model.classes_, probabilities)}

    # Get feature names after preprocessing
    try:
        feature_names = preprocessor.get_feature_names_out()
    except Exception:
        feature_names = [f"feature_{i}" for i in range(len(model.feature_importances_))]

    importances = model.feature_importances_
    top_indices = np.argsort(importances)[::-1][:5]

    top_features = []
    for idx in top_indices:
        raw_name = str(feature_names[idx])
        # Strip sklearn pipeline prefixes like "num__PM2.5" → "PM2.5"
        clean_name = raw_name.split("__")[-1] if "__" in raw_name else raw_name
        display = FEATURE_DISPLAY_NAMES.get(clean_name, clean_name)
        top_features.append(
            FeatureContribution(feature=display, importance=round(float(importances[idx]), 4))
        )

    return ExplainResponse(
        predicted_class=prediction,
        probabilities=class_probs,
        top_features=top_features,
    )


# 5. Compare two locations
@app.post("/compare", response_model=CompareResponse, tags=["Prediction"])
def compare(request: CompareRequest):
    """
    Compare air quality predictions for two locations side by side.
    Returns predictions for both and identifies which location has cleaner air.
    """
    for loc_label, req in [("location_a", request.location_a), ("location_b", request.location_b)]:
        _validate_day(req.DayOfWeek)

    rows = [_build_row(request.location_a), _build_row(request.location_b)]
    df = pd.DataFrame(rows)
    predictions, probabilities = _run_predict(df)

    class_order = ["Good", "Moderate", "Unhealthy for Sensitive", "Unhealthy", "Hazardous"]

    results = []
    for i, (pred, probs, label) in enumerate(
        zip(predictions, probabilities, ["A", "B"])
    ):
        class_probs = {cls: round(float(p), 4) for cls, p in zip(model.classes_, probs)}
        color = AQI_CLASS_INFO.get(pred, {}).get("color", "#cccccc")
        results.append(
            CompareResult(
                location=f"Location {label} ({rows[i]['City']})",
                predicted_class=pred,
                probabilities=class_probs,
                aqi_color=color,
            )
        )

    def class_rank(cls):
        return class_order.index(cls) if cls in class_order else 99

    cleaner_idx = 0 if class_rank(predictions[0]) <= class_rank(predictions[1]) else 1
    cleaner = results[cleaner_idx].location
    summary = (
        f"{cleaner} has cleaner air ({predictions[cleaner_idx]}) "
        f"compared to {results[1 - cleaner_idx].location} ({predictions[1 - cleaner_idx]})."
        if predictions[0] != predictions[1]
        else f"Both locations have the same AQI class: {predictions[0]}."
    )

    return CompareResponse(results=results, cleaner_location=cleaner, summary=summary)


# 6. Single predict (unchanged)
@app.post("/predict", response_model=AQIPredictionResponse, tags=["Prediction"])
def predict(request: AQIPredictionRequest):
    """
    Predict AQI class for a single location.
    """
    _validate_day(request.DayOfWeek)

    df = pd.DataFrame([_build_row(request)])
    predictions, probabilities = _run_predict(df)

    class_probs = {cls: round(float(p), 4) for cls, p in zip(model.classes_, probabilities[0])}
    return AQIPredictionResponse(predicted_class=predictions[0], probabilities=class_probs)


# 7. Batch predict (unchanged)
@app.post("/predict/batch", response_model=list[AQIPredictionResponse], tags=["Prediction"])
def predict_batch(requests: list[AQIPredictionRequest]):
    """
    Predict AQI class for up to 100 locations in a single request.
    """
    if len(requests) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 predictions per batch")

    rows = []
    for i, req in enumerate(requests):
        _validate_day(req.DayOfWeek, index=i)
        rows.append(_build_row(req))

    df = pd.DataFrame(rows)
    predictions, probabilities = _run_predict(df)

    return [
        AQIPredictionResponse(
            predicted_class=pred,
            probabilities={cls: round(float(p), 4) for cls, p in zip(model.classes_, probs)},
        )
        for pred, probs in zip(predictions, probabilities)
    ]
