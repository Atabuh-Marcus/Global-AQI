# Global AQI Project — Full Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Backend — FastAPI (`Global-AQI-API/main.py`)](#4-backend--fastapi)
   - [Imports & App Setup](#41-imports--app-setup)
   - [CORS Middleware](#42-cors-middleware)
   - [Model Loading](#43-model-loading)
   - [Constants](#44-constants)
   - [Helper Functions](#45-helper-functions)
   - [Request/Response Schemas](#46-requestresponse-schemas)
   - [API Endpoints](#47-api-endpoints)
5. [Frontend — TypeScript / React](#5-frontend--typescript--react)
   - [types/api.ts](#51-typesapits)
   - [api/client.ts](#52-apiclientts)
   - [App.tsx](#53-apptsx)
   - [Components](#54-components)
6. [Configuration Files](#6-configuration-files)
7. [Data & Model](#7-data--model)
8. [How to Run](#8-how-to-run)

---

## 1. Project Overview

**Global AQI** is a full-stack machine learning application that predicts **Air Quality Index (AQI)** classifications from environmental sensor readings.

| Layer | Technology |
|---|---|
| ML Model | RandomForestClassifier (scikit-learn) |
| Backend API | FastAPI + Uvicorn (Python) |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Data | 17,472 global city records (2025–2026) |

The model classifies air quality into 5 categories:
- **Good** — AQI 0–50
- **Moderate** — AQI 51–100
- **Unhealthy for Sensitive** — AQI 101–150
- **Unhealthy** — AQI 151–200
- **Hazardous** — AQI 301+

---

## 2. Architecture

```
Browser (localhost:5173)
        │
        │  HTTP fetch (JSON)
        ▼
React Frontend (Vite dev server)
        │
        │  REST API calls
        ▼
FastAPI Backend (localhost:8000)
        │
        │  joblib.load()
        ▼
RandomForest Model + Preprocessor
        │
        │  scikit-learn transform/predict
        ▼
AQI Classification Result
```

The frontend and backend are completely separate processes. They communicate over HTTP. The browser fetches from the Vite dev server for the UI, and the React code calls the FastAPI server for predictions.

---

## 3. Project Structure

```
Global-AQI/
├── .gitignore                              # Git ignore rules
├── Global-AQI-API/                         # Python backend
│   ├── main.py                             # FastAPI application (all endpoints)
│   ├── requirements.txt                    # Python dependencies
│   ├── rf_classifier.joblib                # Trained RandomForest model (5.2 MB)
│   ├── preprocessor.joblib                 # scikit-learn feature preprocessor
│   └── model_metadata.json                 # Feature names and class labels
├── Global-AQI-Frontend/                    # TypeScript frontend
│   ├── index.html                          # HTML entry point
│   ├── package.json                        # Node.js dependencies
│   ├── vite.config.ts                      # Vite bundler config
│   ├── tailwind.config.js                  # Tailwind CSS config
│   ├── tsconfig.json                       # TypeScript compiler config
│   └── src/
│       ├── main.tsx                        # React root mount
│       ├── index.css                       # Tailwind base styles
│       ├── App.tsx                         # Root component + tab navigation
│       ├── api/
│       │   └── client.ts                   # Typed API client (all endpoints)
│       ├── types/
│       │   └── api.ts                      # TypeScript interfaces for all API types
│       └── components/
│           ├── AQIForm.tsx                 # Reusable 11-field input form
│           ├── PredictionCard.tsx          # Result card with probability bars
│           ├── PredictTab.tsx              # Single prediction tab
│           ├── ExplainTab.tsx              # Prediction + feature importance tab
│           ├── BatchTab.tsx                # Batch prediction tab
│           ├── CompareTab.tsx              # Side-by-side location comparison tab
│           ├── AQIClassesTab.tsx           # AQI class reference tab
│           ├── HealthAdviceTab.tsx         # Health recommendations tab
│           └── ModelInfoTab.tsx            # Model metadata tab
├── Global-AQI.ipynb                        # Jupyter notebook (model training)
├── Global_Air_Pollution_Data_2025_2026.csv # Training dataset
├── model_metadata.json                     # Root copy of metadata
├── preprocessor.joblib                     # Root copy of preprocessor
└── rf_classifier.joblib                    # Root copy of model
```

---

## 4. Backend — FastAPI

**File:** [Global-AQI-API/main.py](Global-AQI-API/main.py)

### 4.1 Imports & App Setup

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import json
```

| Import | Purpose |
|---|---|
| `FastAPI` | The web framework that handles HTTP routing |
| `HTTPException` | Raises HTTP error responses (e.g. 404, 422) with a message |
| `CORSMiddleware` | Allows the browser frontend to call the API across different ports |
| `BaseModel` | Pydantic base class — used to define request/response shapes with automatic validation |
| `joblib` | Loads the saved `.joblib` model and preprocessor files from disk |
| `pandas` | Creates DataFrames to feed into the scikit-learn model |
| `numpy` | Used to sort feature importances with `np.argsort` |
| `json` | Reads `model_metadata.json` |

```python
app = FastAPI(
    title="Global AQI Prediction API",
    description="...",
    version="2.0.0",
)
```
Creates the FastAPI application instance. The `title`, `description`, and `version` fields appear automatically in the interactive Swagger UI at `/docs`.

---

### 4.2 CORS Middleware

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**What is CORS?**
Browsers block JavaScript from calling APIs on a different origin (port/domain) by default — this is a security rule called the Same-Origin Policy. CORS (Cross-Origin Resource Sharing) is the mechanism for the server to say "I allow requests from this origin."

- `allow_origins=["http://localhost:5173"]` — only the React dev server is allowed to call this API
- `allow_methods=["*"]` — allows GET, POST, PUT, DELETE etc.
- `allow_headers=["*"]` — allows any HTTP headers (e.g. `Content-Type: application/json`)

Without this, every API call from the frontend would be blocked by the browser.

---

### 4.3 Model Loading

```python
model = joblib.load("rf_classifier.joblib")
preprocessor = joblib.load("preprocessor.joblib")

with open("model_metadata.json") as f:
    metadata = json.load(f)
```

These three lines run **once when the server starts** (not on every request). This is intentional — loading a 5 MB model file on every request would be very slow.

- `rf_classifier.joblib` — the trained RandomForestClassifier with all its 100+ decision trees
- `preprocessor.joblib` — the scikit-learn pipeline that encodes categorical features (City, DayOfWeek) and scales numerical ones before passing them to the model
- `model_metadata.json` — a JSON file listing the feature names and class labels, used to build responses

---

### 4.4 Constants

#### `VALID_DAYS`
```python
VALID_DAYS = ["Monday", "Tuesday", ..., "Sunday"]
```
A list of valid day names used to validate the `DayOfWeek` input field. The model was trained with these exact strings so any other value would give an incorrect prediction.

#### `AQI_CLASS_INFO`
```python
AQI_CLASS_INFO = {
    "Good": { "color": "#00e400", "range": "0–50", "description": "...", "advice": "...", "sensitive_advice": "..." },
    ...
}
```
A dictionary that stores descriptive information about each AQI class. The keys are the exact class names that the model outputs. Each entry holds:
- `color` — hex colour code (matches official US EPA AQI colours)
- `range` — the numeric AQI range this class corresponds to
- `description` — plain-English explanation of the class
- `advice` — recommended action for the general public
- `sensitive_advice` — stricter advice for people with respiratory/heart conditions

#### `FEATURE_DISPLAY_NAMES`
```python
FEATURE_DISPLAY_NAMES = {
    "PM2.5": "PM2.5 (Fine Particles)",
    ...
}
```
Maps internal feature names (as they appear in the scikit-learn pipeline) to human-readable labels shown in the `/predict/explain` endpoint response.

---

### 4.5 Helper Functions

#### `_build_row(req) -> dict`
```python
def _build_row(req) -> dict:
    return {
        "City": req.City,
        "PM2.5": req.PM2_5,
        ...
    }
```
Converts a Pydantic request object into a plain dictionary with the exact column names the model was trained on. The key difference is `PM2_5` (valid Python identifier, used in the API) becomes `"PM2.5"` (the original column name in the training data). This function is called by every prediction endpoint so the mapping only needs to exist in one place.

#### `_validate_day(day, index=None)`
```python
def _validate_day(day: str, index: int = None):
    if day not in VALID_DAYS:
        prefix = f"Item {index}: " if index is not None else ""
        raise HTTPException(status_code=422, detail=f"{prefix}DayOfWeek must be one of {VALID_DAYS}")
```
Validates that the provided day name is one the model knows. If not, raises a `422 Unprocessable Entity` HTTP error with a descriptive message. The optional `index` parameter is used in batch mode to tell the caller which item in the array was invalid (e.g. "Item 2: DayOfWeek must be one of…").

#### `_run_predict(df) -> (predictions, probabilities)`
```python
def _run_predict(df: pd.DataFrame):
    X = preprocessor.transform(df)
    predictions = model.predict(X)
    probabilities = model.predict_proba(X)
    return predictions, probabilities
```
The core ML pipeline in two steps:
1. `preprocessor.transform(df)` — applies encoding and scaling to the raw input DataFrame, converting it into the numeric format the model expects
2. `model.predict(X)` — returns the most likely class for each row (e.g. `["Unhealthy", "Good"]`)
3. `model.predict_proba(X)` — returns the probability for every class for each row (e.g. `[[0.05, 0.62, 0.20, 0.10, 0.03], ...]`)

---

### 4.6 Request/Response Schemas

Pydantic `BaseModel` classes define the exact shape of data coming in (requests) and going out (responses). FastAPI uses these to:
- Auto-validate incoming JSON (returns 422 if a field is missing or wrong type)
- Auto-generate the Swagger UI documentation at `/docs`
- Serialize Python objects to JSON automatically

#### `AQIPredictionRequest`
The input for any prediction. Contains all 11 features:
- `City` (str), `DayOfWeek` (str) — categorical
- `Latitude`, `Longitude`, `PM2_5`, `PM10`, `NO2`, `SO2`, `CO`, `Ozone`, `Aerosol_Optical_Depth` — numerical floats

The `model_config` block provides example values that appear in the Swagger UI.

#### `AQIPredictionResponse`
```python
class AQIPredictionResponse(BaseModel):
    predicted_class: str           # e.g. "Unhealthy"
    probabilities: dict[str, float] # e.g. {"Good": 0.05, "Unhealthy": 0.62, ...}
```

#### `FeatureContribution`
```python
class FeatureContribution(BaseModel):
    feature: str     # Human-readable name e.g. "PM2.5 (Fine Particles)"
    importance: float # e.g. 0.3142
```
Used inside `ExplainResponse` to represent one feature's importance score.

#### `ExplainResponse`
Extends `AQIPredictionResponse` with a `top_features` list — the 5 most important features that drove the prediction.

#### `CompareRequest`
```python
class CompareRequest(BaseModel):
    location_a: AQIPredictionRequest
    location_b: AQIPredictionRequest
```
Wraps two full prediction requests into one object for the `/compare` endpoint.

#### `CompareResult` / `CompareResponse`
`CompareResult` holds the prediction result plus the AQI hex colour for one location.
`CompareResponse` holds both results, the name of the cleaner location, and a human-readable summary sentence.

---

### 4.7 API Endpoints

#### `GET /` — Root
Returns a welcome message and a link to `/docs`. Useful as a quick check that the server is running.

#### `GET /health` — Health Check
```python
@app.get("/health")
def health():
    return {"status": "healthy"}
```
Returns `{"status": "healthy"}` if the server is up. The frontend calls this on load to show the green "API Online" dot. Returns `{"status": "healthy"}` as long as the Python process is running — it does not check the model specifically.

#### `GET /model/info` — Model Metadata
Returns information about the loaded model:
- `model_type` — reads the Python class name of the model object (e.g. `"RandomForestClassifier"`)
- `n_estimators` — number of decision trees in the forest
- `categorical_features` / `numerical_features` — from `model_metadata.json`
- `target_classes` — the 5 AQI class labels the model can output
- `total_features` — sum of categorical + numerical features (11 total)

#### `GET /aqi/classes` — AQI Reference
Returns a dictionary of all 5 AQI classes with their colour, AQI range, and description. Strips out the advice fields (those are returned only by `/health/advice`). This endpoint is called when the frontend loads the AQI Classes tab.

#### `GET /health/advice/{aqi_class}` — Health Advice
```python
match = next((k for k in AQI_CLASS_INFO if k.lower() == aqi_class.lower()), None)
```
Accepts the class name as a URL path parameter. The `next(...)` pattern does a case-insensitive search through the class dictionary — so `/health/advice/GOOD`, `/health/advice/Good`, and `/health/advice/good` all work. Returns 404 if no match is found.

#### `POST /predict` — Single Prediction
The main prediction endpoint:
1. Validates `DayOfWeek`
2. Converts request to a single-row DataFrame via `_build_row`
3. Runs `_run_predict` to get prediction and probabilities
4. Rounds probabilities to 4 decimal places and returns them as a named dictionary

#### `POST /predict/explain` — Prediction + Feature Importance
Does everything `/predict` does, then additionally:
```python
importances = model.feature_importances_
top_indices = np.argsort(importances)[::-1][:5]
```
- `model.feature_importances_` — a NumPy array where each value is how much that feature reduced impurity across all trees (higher = more important)
- `np.argsort(importances)[::-1]` — sorts the indices from most to least important
- `[:5]` — takes only the top 5
- The sklearn pipeline prefixes feature names with `num__` or `cat__` so the code strips those with `.split("__")[-1]`

#### `POST /predict/batch` — Batch Prediction
Accepts a list of up to 100 `AQIPredictionRequest` objects. Instead of calling the model 100 times, all rows are assembled into one DataFrame and the model runs a single `predict` call — this is much faster because RandomForest is vectorised.

#### `POST /compare` — Compare Two Locations
Runs predictions for both locations in one batch call, then determines which is cleaner by ranking their predicted class against a fixed severity order:
```python
class_order = ["Good", "Moderate", "Unhealthy for Sensitive", "Unhealthy", "Hazardous"]
```
The location with the lower index (closer to "Good") is declared the cleaner one. If both have the same class, the summary says so.

---

## 5. Frontend — TypeScript / React

### 5.1 `types/api.ts`

**File:** [Global-AQI-Frontend/src/types/api.ts](Global-AQI-Frontend/src/types/api.ts)

This file contains TypeScript `interface` definitions that mirror the Pydantic schemas from the backend. They are used throughout the frontend to give every variable, function parameter, and return value a precise type.

```typescript
export interface AQIPredictionRequest { ... }   // What we send to /predict
export interface AQIPredictionResponse { ... }  // What /predict returns
export interface ExplainResponse { ... }        // What /predict/explain returns
export interface CompareResponse { ... }        // What /compare returns
export interface AQIClassInfo { ... }           // One entry from /aqi/classes
export interface HealthAdviceResponse { ... }   // What /health/advice returns
export interface ModelInfo { ... }              // What /model/info returns
```

**Why this matters:** TypeScript will show a compile error if you try to access a field that doesn't exist or pass the wrong type. This catches mistakes before they become runtime bugs.

Notable: `ExplainResponse` uses `extends`:
```typescript
export interface ExplainResponse extends AQIPredictionResponse {
    top_features: FeatureContribution[]
}
```
This means `ExplainResponse` has everything `AQIPredictionResponse` has (predicted_class, probabilities), plus the `top_features` array.

---

### 5.2 `api/client.ts`

**File:** [Global-AQI-Frontend/src/api/client.ts](Global-AQI-Frontend/src/api/client.ts)

A single module that contains all communication with the backend. No other file should call `fetch` directly.

#### Base URL
```typescript
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
```
Reads the API URL from an environment variable `VITE_API_URL`. If not set (e.g. in development), defaults to `http://localhost:8000`. To point at a deployed API, create a `.env` file with `VITE_API_URL=https://your-api.com`.

#### `request<T>` — Generic Fetch Wrapper
```typescript
async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Request failed')
    }
    return res.json() as Promise<T>
}
```
- `<T>` is a generic type parameter — the caller specifies what type the response will be (e.g. `request<ModelInfo>`)
- Sets `Content-Type: application/json` on every request so FastAPI knows how to parse the body
- If the HTTP status is not 2xx (`!res.ok`), it tries to read the FastAPI error detail from the JSON body and throws it as a JavaScript Error
- The `.catch(() => ({ detail: res.statusText }))` is a fallback in case the error response is not valid JSON

#### The `api` Object
```typescript
export const api = {
    health: () => request<{ status: string }>('/health'),
    predict: (body: AQIPredictionRequest) =>
        request<AQIPredictionResponse>('/predict', { method: 'POST', body: JSON.stringify(body) }),
    ...
}
```
Each method is a typed function. Components call `api.predict(formData)` rather than writing `fetch(...)` themselves. This centralises all API logic in one place — if the API URL or a route changes, only this file needs updating.

---

### 5.3 `App.tsx`

**File:** [Global-AQI-Frontend/src/App.tsx](Global-AQI-Frontend/src/App.tsx)

The root component. It owns two pieces of state:

#### Tab navigation state
```typescript
type TabId = 'predict' | 'explain' | 'batch' | 'compare' | 'classes' | 'advice' | 'model'
const [activeTab, setActiveTab] = useState<TabId>('predict')
```
`TabId` is a union type — TypeScript will error if you try to set it to anything other than one of those 7 strings. `useState<TabId>` starts on the Predict tab.

#### API health state
```typescript
const [healthy, setHealthy] = useState<boolean | null>(null)

useEffect(() => {
    api.health()
        .then(r => setHealthy(r.status === 'healthy'))
        .catch(() => setHealthy(false))
}, [])
```
- `null` = still checking (shows pulsing grey dot)
- `true` = API responded healthy (green dot, "API Online")
- `false` = fetch failed or API is down (red dot, "API Offline")
- The `[]` dependency array means this `useEffect` runs only once when the component first mounts

#### `TabContent` component
```typescript
function TabContent({ tab }: { tab: TabId }) {
    switch (tab) {
        case 'predict': return <PredictTab />
        ...
    }
}
```
A simple switch that renders the correct tab component. Only one tab is rendered at a time — switching tabs unmounts the old component and mounts the new one, resetting its state.

#### Tab bar rendering
```typescript
{TABS.map(t => (
    <button
        key={t.id}
        onClick={() => setActiveTab(t.id)}
        className={activeTab === t.id ? 'bg-slate-100 text-slate-800' : '...'}
    >
        {t.icon} {t.label}
    </button>
))}
```
Maps over the `TABS` array to render buttons. The active tab gets different Tailwind classes to appear highlighted.

---

### 5.4 Components

#### `AQIForm.tsx` — Reusable Input Form

**File:** [Global-AQI-Frontend/src/components/AQIForm.tsx](Global-AQI-Frontend/src/components/AQIForm.tsx)

Used by PredictTab, ExplainTab, and CompareTab (twice). Renders all 11 input fields.

```typescript
interface Props {
    values: AQIPredictionRequest   // current form state (controlled from parent)
    onChange: (v: AQIPredictionRequest) => void  // callback to update parent state
    label?: string                 // optional section title ("Location A")
}
```
This is a **controlled component** — it does not own its state. The parent holds the state and passes `values` down; the form calls `onChange` when any field changes. This pattern makes it easy to use the same form in multiple places.

```typescript
const set = (key: keyof AQIPredictionRequest, raw: string) => {
    const numericKeys = ['Latitude', 'Longitude', 'PM2_5', ...]
    onChange({
        ...values,
        [key]: numericKeys.includes(key) ? parseFloat(raw) || 0 : raw,
    })
}
```
The `set` function handles both text and numeric fields. HTML `<input>` elements always give back a string, so numeric fields are converted with `parseFloat`. If the user clears the field and `parseFloat` returns `NaN`, `|| 0` falls back to 0.

---

#### `PredictionCard.tsx` — Result Display Card

**File:** [Global-AQI-Frontend/src/components/PredictionCard.tsx](Global-AQI-Frontend/src/components/PredictionCard.tsx)

Shared by PredictTab, ExplainTab, and CompareTab to display a prediction result.

```typescript
const sorted = Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
const maxProb = sorted[0]?.[1] ?? 1
```
Sorts the probabilities from highest to lowest so the most likely class appears at the top. `maxProb` is used to scale all the bars relative to the highest probability (not relative to 100%) so differences are easier to see visually.

```typescript
style={{ width: `${(prob / maxProb) * 100}%`, backgroundColor: CLASS_COLORS[cls] }}
```
Each bar's width is a percentage of the maximum probability, and the colour matches the AQI class colour. The `transition-all duration-500` Tailwind class animates the bars in when the card first renders.

The `classEmoji` function returns a contextually appropriate emoji for each class (🌿 for Good, ☠️ for Hazardous, etc.) to make the result visually scannable at a glance.

---

#### `PredictTab.tsx` — Single Prediction

**File:** [Global-AQI-Frontend/src/components/PredictTab.tsx](Global-AQI-Frontend/src/components/PredictTab.tsx)

Owns the form state, loading state, error state, and result state for the Predict tab.

```typescript
const [form, setForm] = useState<AQIPredictionRequest>(DEFAULT_VALUES)
const [result, setResult] = useState<AQIPredictionResponse | null>(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

The `submit` function:
```typescript
const submit = async () => {
    setLoading(true)
    setError(null)
    try {
        setResult(await api.predict(form))
    } catch (e) {
        setError((e as Error).message)
    } finally {
        setLoading(false)
    }
}
```
- Clears any previous error before each call
- `await api.predict(form)` calls the backend and waits for the result
- If the call throws (network error or API error), the catch block stores the message in `error` state to display to the user
- `finally` always runs — ensures `loading` is set back to `false` whether the call succeeded or failed

---

#### `ExplainTab.tsx` — Prediction + Feature Importance

**File:** [Global-AQI-Frontend/src/components/ExplainTab.tsx](Global-AQI-Frontend/src/components/ExplainTab.tsx)

Identical structure to PredictTab but calls `api.predictExplain` and renders the extra `top_features` data as horizontal bars.

```typescript
const maxImportance = result ? Math.max(...result.top_features.map(f => f.importance)) : 1
```
Finds the highest importance value among the top 5 features so all bars scale relative to the most important one. Uses the spread operator `...` to pass the array values as individual arguments to `Math.max`.

Each feature bar is numbered (1–5) with a small badge to show rank clearly.

---

#### `BatchTab.tsx` — Batch Prediction

**File:** [Global-AQI-Frontend/src/components/BatchTab.tsx](Global-AQI-Frontend/src/components/BatchTab.tsx)

Takes raw JSON text input instead of a form because batch requests can have many items.

```typescript
const parsed = JSON.parse(json)
if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array')
setResults(await api.predictBatch(parsed))
```
Parses the textarea content as JSON and validates it's an array before sending. If `JSON.parse` fails (invalid JSON), it throws a SyntaxError which is caught and displayed as an error message.

Results are shown in a table. Each row displays the predicted class as a coloured badge (using the AQI colour as background) and a mini progress bar for the confidence level.

---

#### `CompareTab.tsx` — Side-by-Side Comparison

**File:** [Global-AQI-Frontend/src/components/CompareTab.tsx](Global-AQI-Frontend/src/components/CompareTab.tsx)

Manages two independent form states (one per location):

```typescript
const [formA, setFormA] = useState<AQIPredictionRequest>(DEFAULT_VALUES)
const [formB, setFormB] = useState<AQIPredictionRequest>(LOCATION_B_DEFAULT)
```
Location B defaults to Tokyo so users immediately see a contrast with the Lahore default (Location A has heavy pollution, Location B has clean air).

```typescript
setResult(await api.compare(formA, formB))
```
Sends both forms in one request. The verdict banner shows the summary sentence from the API, and the two `PredictionCard` components are rendered side by side.

---

#### `AQIClassesTab.tsx` — AQI Class Reference

**File:** [Global-AQI-Frontend/src/components/AQIClassesTab.tsx](Global-AQI-Frontend/src/components/AQIClassesTab.tsx)

```typescript
useEffect(() => {
    api.aqiClasses()
        .then(setClasses)
        .catch(e => setError((e as Error).message))
}, [])
```
Fetches the class data once on mount. No form or submit button — this is a read-only reference panel. Each class is rendered as a card with its colour as the header background. Light-coloured classes (Good, Moderate, Unhealthy for Sensitive) use dark text; dark-coloured classes (Unhealthy, Hazardous) use white text for readability.

---

#### `HealthAdviceTab.tsx` — Health Recommendations

**File:** [Global-AQI-Frontend/src/components/HealthAdviceTab.tsx](Global-AQI-Frontend/src/components/HealthAdviceTab.tsx)

```typescript
const fetch = async (cls: string) => {
    setSelected(cls)
    setLoading(true)
    ...
    setAdvice(await api.healthAdvice(cls))
}
```
Each pill button calls `fetch` with the class name. The API is called every time a button is clicked — there is no caching, but since there are only 5 options and the responses are tiny, this is fine.

The advice is split into two colour-coded boxes:
- Blue box — general public advice
- Amber box — sensitive groups advice (stricter guidance)

---

#### `ModelInfoTab.tsx` — Model Metadata

**File:** [Global-AQI-Frontend/src/components/ModelInfoTab.tsx](Global-AQI-Frontend/src/components/ModelInfoTab.tsx)

Fetches from `/model/info` on mount and displays the data in three sections:
1. **Stats row** — four metric cards (model type, version, estimators, total features)
2. **Feature lists** — two columns showing numerical and categorical features
3. **Target classes** — pill badges for each of the 5 AQI classes

---

## 6. Configuration Files

### `vite.config.ts`
```typescript
export default defineConfig({
    plugins: [react()],
    server: { port: 5173 },
})
```
Vite is the build tool and development server. The `@vitejs/plugin-react` plugin enables React fast refresh (live reloading when you edit a component without losing state). Port 5173 is the default Vite port.

### `tailwind.config.js`
```javascript
content: ['./index.html', './src/**/*.{ts,tsx}']
```
Tells Tailwind which files to scan for class names. Tailwind removes any class that doesn't appear in these files from the final CSS bundle (this is called "purging") — so the production CSS is tiny even though Tailwind has thousands of utility classes.

### `tsconfig.json`
Key settings:
- `"jsx": "react-jsx"` — enables JSX syntax in `.tsx` files without importing React in every file
- `"strict": true` — enables all strict TypeScript checks (catches more bugs)
- `"moduleResolution": "bundler"` — uses Vite's module resolution rules

### `postcss.config.js`
PostCSS is a CSS processor. This config runs Tailwind (to generate utility classes) and Autoprefixer (to add vendor prefixes like `-webkit-` for browser compatibility) on all CSS files.

---

## 7. Data & Model

### Dataset: `Global_Air_Pollution_Data_2025_2026.csv`
- **17,472 rows** of real-world pollution measurements
- **Columns:** Date, City, Latitude, Longitude, PM2.5, PM10, NO2, SO2, CO, Ozone, Aerosol_Optical_Depth, AQI_Class
- **Time range:** August 2025 – 2026
- **Coverage:** Cities across multiple countries

### `model_metadata.json`
```json
{
  "categorical_features": ["City", "DayOfWeek"],
  "numerical_features": ["Latitude", "Longitude", "PM2.5", "PM10", "NO2", "SO2", "CO", "Ozone", "Aerosol_Optical_Depth"],
  "classes": ["Good", "Hazardous", "Moderate", "Unhealthy", "Unhealthy for Sensitive"]
}
```
This file acts as a contract between the training notebook and the API — it documents what features the model expects so the API can validate inputs correctly.

### `rf_classifier.joblib` — The Model
A `RandomForestClassifier` from scikit-learn. A Random Forest:
- Builds many decision trees (typically 100+) during training
- Each tree votes on the class for a new input
- The final prediction is the majority vote
- `predict_proba` returns the fraction of trees that voted for each class (this is the probability)

### `preprocessor.joblib` — The Pipeline
A scikit-learn `ColumnTransformer` that applies different transformations to different columns:
- **Categorical columns** (City, DayOfWeek) → OneHotEncoding (converts text labels to binary columns)
- **Numerical columns** → StandardScaler or similar (centres and scales values so no one feature dominates)

Both files are loaded into memory once at server startup and reused for every prediction.

---

## 8. How to Run

### Prerequisites
- Python 3.9+
- Node.js 18+ (installed via nvm)

### 1. Start the Backend
```bash
cd Global-AQI-API
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```
- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### 2. Start the Frontend
```bash
cd Global-AQI-Frontend
npm install        # first time only
npm run dev
```
- Dashboard: http://localhost:5173

### Environment Variables (optional)
Create `Global-AQI-Frontend/.env` to point at a different API:
```
VITE_API_URL=https://your-deployed-api.com
```

### Build for Production
```bash
cd Global-AQI-Frontend
npm run build      # outputs to dist/
```
The `dist/` folder contains static HTML/CSS/JS that can be served by any web server or CDN.
