# ECG Signal Processing Graphs - Comprehensive Guide

## Overview
This application is designed to **detect and analyze non-stationary changes in ECG signals** using adaptive filtering and change-point detection algorithms. All graphs are specifically designed to work with and reveal non-stationary behavior.

---

## Graph Breakdown & Non-Stationarity Relevance

### **1. Unfiltered ECG Signal (Top-Left)**
**Functionality:**
- Displays the **raw original ECG signal** loaded from CSV
- Shows cardiac activity without any processing
- Time-domain representation: X-axis = Time (seconds), Y-axis = Amplitude (mV)
- Updates in real-time as you modify the signal duration slider

**Non-Stationary Relevance:** ⭐⭐⭐⭐⭐ **HIGHLY RELEVANT**
- **Baseline Segment (0-50% of signal):** Represents "normal" cardiac pattern - stationary behavior
- **After Injection Point:** Shows visible shifts, distortions, or pattern changes when anomalies are injected
- **Key Indicator:** If signal looks different before/after change-point, that's non-stationary behavior
- **Example:** After injecting AR shift, you'll see the waveform pattern completely change

---

### **2. Noisy ECG Signal (Middle-Left)**
**Functionality:**
- Displays ECG **after adding artificial noise sources:**
  - **Baseline Wander:** Low-frequency drift (respiration artifact ~0.1 Hz)
  - **Powerline Interference:** 50/60 Hz electrical noise
  - **EMG Noise:** Muscle electrical activity (high frequency)
- Shows how real-world ECG signals are corrupted
- Only displays when you check at least one noise checkbox AND click "Add Noise to Signal"

**Non-Stationary Relevance:** ⭐⭐⭐⭐ **VERY RELEVANT**
- **Noise Characteristics Change:** Different noise sources dominate different time intervals
- **Variance Non-Stationarity:** Noise power increases/decreases over time
- **Pattern Masking:** Non-stationary changes in ECG can be hidden by noise
- **Problem:** Makes change detection harder - this is why adaptive filters are needed

---

### **3. Filtered ECG Signal (Top-Right)**
**Functionality:**
- Displays output of **supervised adaptive filter** (NLMS, LMS, or RLS)
- Compares noisy signal to clean reference signal and learns to recover it
- Shows **adaptive learning in action:**
  - Filter weights adapt to minimize MSE (Mean Squared Error)
  - Weights updated at each sample based on prediction error
- Displays algorithm parameters in title:
  - `NLMS — μ=0.05 — M=2` (step size and filter order)
  - `RLS — λ=0.97 — M=2` (forgetting factor)

**Non-Stationary Relevance:** ⭐⭐⭐ **MODERATELY RELEVANT**
- **Supervised Mode:** Uses clean reference as target (assumes target is stationary)
- **Adaptive Learning:** If signal becomes non-stationary, MSE will increase
- **MSE Metric:** Shows how well filter is performing
- **Limitation:** Can't detect non-stationarity itself - only removes noise from current pattern
- **Usefulness:** Prepares signal for change detection algorithms

---

### **4. Error Power Signal (Pe) (Middle-Right)**
**Functionality:**
- Displays **sliding-window error power** from LMS/RLS predictor
- Shows prediction errors calculated by unsupervised algorithm:
  - Predictor: `ŷ[n+1] = w₀·x[n] + w₁·x[n-1] + ... + w_M·x[n-M]`
  - Error: `e[n] = x[n+1] - ŷ[n+1]`
- **Two lines shown:**
  - **Blue line:** Error power `Pe[n]` = average squared error in last L samples
  - **Orange line:** Adaptive threshold `θ = mean + K·std`
  - **Red dot:** Detection point where Pe crosses threshold

**Non-Stationary Relevance:** ⭐⭐⭐⭐⭐ **HIGHLY RELEVANT - CORE DETECTION METRIC**
- **Normal Signal:** Pe stays low and flat (prediction accurate)
- **Non-Stationary Change:** Pe **spikes dramatically** when pattern changes
- **Why It Works:** When signal characteristics change, learned filter can no longer predict accurately
- **Detection Logic:**
  ```
  IF Pe[n] > θ THEN
    Anomaly/Change Detected at sample n
  END
  ```
- **Threshold Adaptive:** Automatically adjusts to signal properties
- **Example Timeline:**
  - Samples 0-1250: Pe ≈ 0.01 (normal)
  - Sample 1250: Inject AR change
  - Samples 1250-1350: Pe spikes to 2.5
  - Red dot marks exact detection point

---

### **5. Filter Weights History (Bottom-Left)**
**Functionality:**
- Shows **how filter coefficients evolve over time**
- X-axis: Sample number, Y-axis: Weight value
- Multiple lines = multiple filter taps (w₀, w₁, ..., w_M)
- Updated every 5 samples (sparse logging for performance)

**Non-Stationary Relevance:** ⭐⭐⭐⭐ **VERY RELEVANT**
- **Stable Region:** Weights converge and stay constant
- **After Non-Stationarity:** Weights suddenly change direction/magnitude
- **Rapid Fluctuation:** Indicates filter struggling to adapt to new pattern
- **Visual Proof:** Shows algorithm "learning" is disrupted by signal changes

---

### **6. Power Spectral Density - Unfiltered (Bottom-Center-Left)**
**Functionality:**
- Shows **frequency content** of raw/noisy ECG signal
- X-axis: Frequency (Hz), Y-axis: Power (dB)
- Multiple curves represent:
  - Clean signal baseline
  - Noise peaks at 50/60 Hz (powerline)
  - Elevated baseline around 0.1-0.5 Hz (baseline wander)

**Non-Stationary Relevance:** ⭐⭐⭐ **MODERATELY RELEVANT**
- **Stationary Signal:** Frequency content remains constant over time (classic spectrum)
- **Non-Stationary Signal:** Spectrum changes with time (requires spectrogram for full picture)
- **Limited View:** Single PSD averaged over entire window doesn't show temporal changes
- **Usefulness:** Validates noise injection worked (peaks at expected frequencies)
- **Better for:** Diagnosing signal quality (comparing before/after noise)

---

### **7. Power Spectral Density - Filtered (Bottom-Center-Right)**
**Functionality:**
- Shows **frequency content after adaptive filtering**
- Should show:
  - ECG peaks (0.5-40 Hz) - preserved
  - Powerline peaks (50/60 Hz) - **reduced or removed**
  - Baseline wander - **attenuated**

**Non-Stationary Relevance:** ⭐⭐ **WEAKLY RELEVANT**
- **Comparison Tool:** Highlights filtering effectiveness
- **Non-Stationary Insight:** If filtered spectrum looks very different from unfiltered, signal had severe non-stationarity
- **Averaged View:** Like unfiltered PSD, doesn't show temporal changes

---

### **8. Detection Results Panel (Right Panel)**
**Functionality:**
- **LMS Results:**
  - Threshold (θ): Adaptive detection threshold
  - Detection Index: First sample where Pe > θ
  - Status: "No anomaly detected" or exact sample number

- **RLS Results:**
  - Threshold (θ): Usually more aggressive than LMS
  - Detection Index: Change-point location (sample number)
  - Peak Trace: Maximum covariance trace value and location
  - (RLS specific: tracks P matrix diagonal trace for convergence)

**Non-Stationary Relevance:** ⭐⭐⭐⭐⭐ **HIGHLY RELEVANT - FINAL OUTPUT**
- **Primary Purpose:** **Localizes non-stationary change exactly**
- **Interpretation:**
  - Detection at sample 1250 ÷ 500 Hz = **2.5 seconds** = exact change location
  - Compares with injected change point
  - Measures detection accuracy
- **Algorithm Comparison:** LMS vs RLS performance on same signal
  - **LMS:** Slower convergence, smoother threshold
  - **RLS:** Faster convergence, sharper detection

---

## Signal Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Raw ECG from CSV                            │
│              (ecg100/200/300.csv - 2500 samples)                │
└─────────────────────┬──────────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
    [Unfiltered]            [Inject Change-Point]
    ECG Signal (1)          (AR/Wander/Variance)
         │                         │
         │    ┌────────────────────┘
         │    ▼
    [Add Noise]◄─── Baseline Wander / Powerline / EMG
         │
         ▼
    [Noisy ECG] (2)
         │
    ┌────┴────────────────┐
    ▼                     ▼
[Supervised Filter]  [Unsupervised Predictor]
  (NLMS/LMS/RLS)        (LMS/RLS)
  Uses clean ref        Predicts next sample
    │                     │
    ▼                     ▼
[Filtered ECG] (3)   [Prediction Error] → [Error Power] (4)
                            │
                            ▼
                      [Compare to Threshold]
                            │
                            ▼
                      ┌─────────────────┐
                      │ CHANGE DETECTED │ (8)
                      │ or "No change"  │
                      └─────────────────┘
```

---

## Non-Stationary Detection Strategy

### **What is Non-Stationarity in ECG?**
Signal characteristics change over time:
- **Mean shifts:** Baseline wander
- **Variance changes:** Noise/artifact spikes
- **AR parameters shift:** Spectral/pattern changes (most important)
- **Transients:** Sudden events (arrhythmias, electrode issues)

### **Why These Graphs Detect It?**

1. **Graphs 1-2 (Visual):** Human can see pattern changes
2. **Graphs 4-5 (Algorithmic):** 
   - Error Power spikes when learned pattern breaks
   - Weight history shows adaptation struggle
3. **Graphs 6-7 (Frequency):** Show spectrum changes
4. **Graph 8 (Decision):** Outputs exact change location

### **Key Insight:**
- Adaptive filters **assume stationarity** in their training region
- When signal becomes **non-stationary**, prediction errors explode
- This error explosion = **anomaly detection**

---

## How to Use These Graphs Together

**Recommended Workflow:**
1. **Load ecg200** (default)
2. **Click "Generate ECG Signal"** → See Graph 1 (baseline)
3. **Set change-point position** (e.g., 1250 samples = 2.5s)
4. **Select non-stationarity type** (AR shift recommended)
5. **Click "Inject Change-point"** → 
   - Graph 1 shows discontinuity/pattern break
   - Graph 5 shows weights adapting erratically
6. **Run LMS Predictor** → 
   - Graph 4 shows Pe spike at exact change point
   - Graph 8 shows detection results
7. **Compare RLS** → Often detects faster/more sharply

---

## Performance Indicators

| Graph | Best If | Problem If |
|-------|---------|-----------|
| Graph 1 (Unfiltered) | Shows clear waveform | Flat/noisy (bad data) |
| Graph 2 (Noisy) | Noise visible but not overwhelming | Too much noise (obscures signal) |
| Graph 3 (Filtered) | Looks like clean reference | Still very noisy (bad filter) |
| Graph 4 (Pe) | Single spike at change point | Multiple spikes (false detections) |
| Graph 5 (Weights) | Stable then sudden change | Oscillating wildly (unstable) |
| Graphs 6-7 (PSD) | Clear peaks at ECG frequencies | No clear structure (noise dominated) |
| Graph 8 (Results) | Detection near injected point | No detection or far off |

