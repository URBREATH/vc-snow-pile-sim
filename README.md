# snow-pile-analysis

**Provided by:** VC Map Project (virtualcitySYSTEMS)

## Description

The Snow Pile Analysis Plugin is an extension for the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui). It simulates, visualizes, and analyzes snow pile melting using environmental parameters and historical weather data. Results include meltwater and weather charts, PDF reports, and CSV data exports.

## Installation Prerequisites

- A VC Map environment.
- Access to historical weather data from Open-Meteo for the supported regions.

## Installation Instructions

Installation and deployment steps were not specified in the provided documentation.

## Built Image Registry

Not specified in the provided documentation.

## License

This project is licensed under the MIT License.

Copyright 2025 tadolphi <tadolphi@vc.systems>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## External technical resources

- [Open-Meteo](https://open-meteo.com/) — weather data provider.

## User Guide References

No separate user guide or FAQ links were included in the provided documentation. Usage steps are included under [Additional Information](#additional-information).

## Additional Information

### Core features

- **Snow pile modeling:** Configure pile height, surface type, location, and simulation start date. Supported regions include Kajaani and Tallinn.
- **Interactive spatial analysis:** Draw the snow pile footprint on the map using polygon or bounding-box tools.
- **Melting simulation:** Use daily maximum and minimum temperatures, precipitation, and sunshine duration from weather files retrieved from Open-Meteo. A degree-day model adjusts melting rates based on solar exposure and rainfall.
- **Volume tracking:** Monitor snow pile height and volume reduction over time.
- **Results and reporting:** View charts of daily meltwater production and weather trends. Export a PDF report with analysis details and charts, or export raw data to CSV.

### How to use

1. Open the analysis window by clicking the snowmelt icon in the VC Map toolbox.
2. Set the pile height, location, and simulation start date.
3. Use the drawing tool to mark the snow pile footprint on the map.
4. Run the analysis.
5. Review the results in the results window and export charts or reports.

### Project structure

- `index.ts` — plugin entry point, UI registration, and “Waterflow” map styles.
- `snowmelt.ts` — mathematical simulation model.
- `fetchWeatherData.ts` — weather data acquisition.
- `snowpileMainWindow.vue` — primary project setup interface.
- `snowpileResultWindow.vue` — results dashboard with charts and exports.
