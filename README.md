# snow-pile-analysis

> Part of the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui)

Snow Pile Analysis Plugin

The Snow Pile Analysis Plugin is an extension for the VC Map project. It provides tools to simulate, visualize, and analyze the melting behavior of snow piles based on environmental parameters and historical weather data.

## Core Features

### 🏔️ Snow Pile Modeling

Users can configure the physical properties of a snow pile to be analyzed:

- Location-Specific Data: Select from supported regions (e.g., Kajaani, Tallinn) to automatically fetch historical weather profiles.

- Physical Parameters: Input initial pile height and define the surface type (e.g., roof types or ground characteristics) to refine runoff calculations.

- Temporal Control: Choose a specific start date for the melting simulation.

### 🗺️ Interactive Spatial Analysis

- Area Selection: Define the footprint of the snow pile directly on the map using interactive drawing tools for polygons or bounding boxes.

### ☀️ Scientific Melting Simulation

The core logic integrates meteorological factors to model the snowpack lifecycle:

- Fetches daily max/min temperatures, precipitation, and sunshine duration from weather files (retrieved from Open Meteo).

- Melting Algorithm: Uses a degree-day model that adjusts melting rates based on solar exposure and rainfall contributions.
- Volume Tracking: Monitors the height and volume reduction of the pile over time.

### 📊 Results & Reporting

- Data Visualization: Interactive charts displaying daily meltwater production and weather trends.

- Export Options:

  - Professional PDF Reports containing analysis details and charts.

  - Raw data export to CSV for external analysis.

## Project Structure

- index.ts: Plugin entry point, UI registration, and "Waterflow" map styles.

- snowmelt.ts: The mathematical simulation model.
- fetchWeatherData.ts: Weather data acquisition layer.
- snowpileMainWindow.vue: Primary user interface for project setup.
- snowpileResultWindow.vue: The results dashboard with charts and exports.

## How to Use

1. Open the Tool: Click the snowmelt icon in the VC Map toolbox to open the analysis window.
1. Define Pile: Set the height, location, and date.
1. Draw Area: Use the draw tool to mark the snow pile's location on the map.
1. Run & Analyze: View the calculated waterflow layer on the map and check the results window for detailed charts and report exports.
