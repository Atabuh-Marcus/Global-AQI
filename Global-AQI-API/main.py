# ─── Imports ───────────────────────────────────────────────────────────────────
# FastAPI core: app factory, HTTP error responses
from fastapi import FastAPI, HTTPException
# CORS middleware allows the React frontend (port 5173) to call this API (port 8000)
from fastapi.middleware.cors import CORSMiddleware
# Pydantic: data validation and automatic JSON schema generation for request/response models
from pydantic import BaseModel
# joblib: deserializes the trained RandomForest model and sklearn preprocessor from disk
import joblib
# pandas: builds DataFrames that the sklearn preprocessor expects as input
import pandas as pd
# numpy: used for argsort on feature-importance arrays
import numpy as np
# json: reads the model_metadata.json file saved alongside the model artifacts
import json

# ─── App factory ───────────────────────────────────────────────────────────────
# Creates the FastAPI application. The title and description appear in /docs (Swagger UI).
app = FastAPI(
    title="Global AQI Prediction API",
    description="Predict Air Quality Index (AQI) class using a trained RandomForestClassifier",
    version="2.0.0",
)

# ─── CORS middleware ────────────────────────────────────────────────────────────
# Without this the browser blocks all cross-origin requests from the React dev server.
# allow_origins restricts access to the Vite dev server only (tighten for production).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],   # GET, POST, OPTIONS, etc.
    allow_headers=["*"],   # Content-Type, Authorization, etc.
)

# ─── Model artifacts ────────────────────────────────────────────────────────────
# Loaded once at startup so every request reuses the same in-memory objects.
# rf_classifier.joblib  — trained RandomForestClassifier (sklearn)
# preprocessor.joblib   — ColumnTransformer (OneHotEncoder + StandardScaler)
# model_metadata.json   — feature names and target class labels saved during training
model = joblib.load("rf_classifier.joblib")
preprocessor = joblib.load("preprocessor.joblib")

with open("model_metadata.json") as f:
    metadata = json.load(f)

# ─── Constants ─────────────────────────────────────────────────────────────────
# Valid values for the DayOfWeek categorical feature — used in validation helpers below.
VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Per-class display metadata returned by the /aqi/classes and /health/advice endpoints.
# Keys match the string labels the model predicts; values hold UI colour, AQI numeric range,
# human-readable description, and separate advice for the general public vs. sensitive groups.
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

# Maps raw feature column names (as used during training) to friendly display names
# shown in the /predict/explain endpoint response.
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
    """
    Converts a Pydantic request object into a plain dict whose keys match the
    column names the sklearn preprocessor was fitted on during training.
    Note: Pydantic uses PM2_5 (valid Python identifier) but the training data
    used "PM2.5" — this mapping bridges that gap.
    """
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
    """
    Raises HTTP 422 if day is not in VALID_DAYS.
    index is used in batch requests to identify which item failed.
    """
    if day not in VALID_DAYS:
        prefix = f"Item {index}: " if index is not None else ""
        raise HTTPException(status_code=422, detail=f"{prefix}DayOfWeek must be one of {VALID_DAYS}")


def _run_predict(df: pd.DataFrame):
    """
    Applies the preprocessor (encoding + scaling) then runs the RandomForest.
    Returns a tuple of (predictions array, probabilities 2-D array).
    Shared by /predict, /predict/batch, and /compare to avoid duplication.
    """
    X = preprocessor.transform(df)
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)
    return predictions, probabilities


# ─── Schemas ───────────────────────────────────────────────────────────────────

class AQIPredictionRequest(BaseModel):
    """Input schema for a single location prediction. All 11 fields are required."""
    City: str
    DayOfWeek: str
    Latitude: float
    Longitude: float
    PM2_5: float    # Note: mapped to "PM2.5" column in _build_row
    PM10: float
    NO2: float
    SO2: float
    CO: float
    Ozone: float
    Aerosol_Optical_Depth: float

    model_config = {
        # Example payload shown in /docs Swagger UI
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
    """Base prediction output: the winning class and a probability score per class."""
    predicted_class: str
    probabilities: dict[str, float]


class FeatureContribution(BaseModel):
    """A single feature name and its global importance score from the RandomForest."""
    feature: str
    importance: float


class ExplainResponse(BaseModel):
    """Extended prediction output that also includes the top 5 feature importances."""
    predicted_class: str
    probabilities: dict[str, float]
    top_features: list[FeatureContribution]


class CompareRequest(BaseModel):
    """Wraps two prediction requests for the side-by-side comparison endpoint."""
    location_a: AQIPredictionRequest
    location_b: AQIPredictionRequest


class CompareResult(BaseModel):
    """Prediction result for one location in a comparison, enriched with the AQI colour."""
    location: str
    predicted_class: str
    probabilities: dict[str, float]
    aqi_color: str


class CompareResponse(BaseModel):
    """
    Full comparison output: individual results for both locations, the name of
    the cleaner location, and a human-readable summary sentence.
    """
    results: list[CompareResult]
    cleaner_location: str
    summary: str


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    """Root ping — confirms the API is reachable and points to /docs."""
    return {"message": "Global AQI Prediction API v2", "docs": "/docs"}


@app.get("/health")
def health():
    """
    Lightweight liveness check polled by the React frontend on startup.
    Returns {"status": "healthy"} when the API is running.
    """
    return {"status": "healthy"}


# 1. Model info
@app.get("/model/info", tags=["Model"])
def model_info():
    """
    Returns model metadata: type, version, feature names, and target classes.
    Useful for the frontend ModelInfo tab and for debugging the deployed model.
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
    Powers the AQI Classes reference tab in the frontend.
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
    The lookup is case-insensitive so "good", "Good", and "GOOD" all work.
    Raises HTTP 404 if the class name is unrecognised.
    """
    # Case-insensitive lookup — find the canonical key regardless of capitalisation
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

    Feature names coming out of the sklearn pipeline have prefixes like "num__PM2.5".
    We strip everything up to and including "__" to get the clean column name, then
    map it to a human-friendly display name via FEATURE_DISPLAY_NAMES.
    """
    _validate_day(request.DayOfWeek)

    df = pd.DataFrame([_build_row(request)])
    X = preprocessor.transform(df)

    prediction = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]
    # Build a dict keyed by class name with rounded probability values
    class_probs = {cls: round(float(p), 4) for cls, p in zip(model.classes_, probabilities)}

    # Retrieve feature names after preprocessing (e.g. one-hot encoding expands categoricals)
    try:
        feature_names = preprocessor.get_feature_names_out()
    except Exception:
        # Fallback for older sklearn versions that lack get_feature_names_out
        feature_names = [f"feature_{i}" for i in range(len(model.feature_importances_))]

    importances = model.feature_importances_
    # argsort ascending, reverse to get descending, take first 5
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
    Both rows are preprocessed and scored in a single batch call for efficiency.
    The cleaner location is determined by class rank (Good=0 … Hazardous=4).
    If both locations have the same class, the summary says so.
    """
    # Validate DayOfWeek for both locations before touching the model
    for loc_label, req in [("location_a", request.location_a), ("location_b", request.location_b)]:
        _validate_day(req.DayOfWeek)

    rows = [_build_row(request.location_a), _build_row(request.location_b)]
    df = pd.DataFrame(rows)
    predictions, probabilities = _run_predict(df)

    # Ordered from best to worst — used to determine which location is "cleaner"
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
        # Returns the index in class_order, or 99 for any unexpected class
        return class_order.index(cls) if cls in class_order else 99

    # Lower rank = cleaner air; ties default to Location A
    cleaner_idx = 0 if class_rank(predictions[0]) <= class_rank(predictions[1]) else 1
    cleaner = results[cleaner_idx].location
    summary = (
        f"{cleaner} has cleaner air ({predictions[cleaner_idx]}) "
        f"compared to {results[1 - cleaner_idx].location} ({predictions[1 - cleaner_idx]})."
        if predictions[0] != predictions[1]
        else f"Both locations have the same AQI class: {predictions[0]}."
    )

    return CompareResponse(results=results, cleaner_location=cleaner, summary=summary)


# 6. Single predict
@app.post("/predict", response_model=AQIPredictionResponse, tags=["Prediction"])
def predict(request: AQIPredictionRequest):
    """
    Predict AQI class for a single location.
    Returns the predicted class and a probability score for each possible class.
    """
    _validate_day(request.DayOfWeek)

    df = pd.DataFrame([_build_row(request)])
    predictions, probabilities = _run_predict(df)

    class_probs = {cls: round(float(p), 4) for cls, p in zip(model.classes_, probabilities[0])}
    return AQIPredictionResponse(predicted_class=predictions[0], probabilities=class_probs)


# 7. Batch predict
@app.post("/predict/batch", response_model=list[AQIPredictionResponse], tags=["Prediction"])
def predict_batch(requests: list[AQIPredictionRequest]):
    """
    Predict AQI class for up to 100 locations in a single request.
    All rows are preprocessed and scored in one vectorised call — much faster
    than calling /predict 100 times sequentially.
    DayOfWeek is validated for each item before any model inference happens.
    """
    if len(requests) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 predictions per batch")

    rows = []
    for i, req in enumerate(requests):
        # Pass index so the error message names the offending item
        _validate_day(req.DayOfWeek, index=i)
        rows.append(_build_row(req))

    df = pd.DataFrame(rows)
    predictions, probabilities = _run_predict(df)

    # Zip predictions with their corresponding probability rows and build response list
    return [
        AQIPredictionResponse(
            predicted_class=pred,
            probabilities={cls: round(float(p), 4) for cls, p in zip(model.classes_, probs)},
        )
        for pred, probs in zip(predictions, probabilities)
    ]
