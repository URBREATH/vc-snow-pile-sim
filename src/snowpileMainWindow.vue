<template>
  <div>
    <v-form ref="form">
      <VcsFormSection
        :heading="$t('snowpile.help-title')"
        start-open
        :start-help-open="true"
      >
        <template #help>
          <ol>
            <li>{{ $t('snowpile.hint1.title') }}:</li>
            <span>{{ $t('snowpile.hint1.description') }}</span>
            <li>{{ $t('snowpile.hint2.title') }}:</li>
            <span>{{ $t('snowpile.hint2.description') }}</span>
            <li>{{ $t('snowpile.hint3.title') }}:</li>
            <span>{{ $t('snowpile.hint3.description') }}</span>
          </ol>
        </template>
      </VcsFormSection>
    </v-form>
    <v-container>
      <v-row no-gutters>
        <v-col>
          <VcsLabel html-for="dateInput" :tooltip="$t('snowpile.dateTooltip')">
            {{ $t('snowpile.date') }}</VcsLabel
          >
        </v-col>
        <v-col>
          <VcsDatePicker id="dateInput" v-model="date" />
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <VcsLabel
            html-for="selectInputLocations"
            :tooltip="$t('snowpile.locationTooltip')"
          >
            {{ $t('snowpile.location') }}
          </VcsLabel>
        </v-col>
        <v-col>
          <VcsSelect
            id="selectInputLocations"
            :items="locations.map((loc) => loc.name)"
            v-model="selectedLocation"
          />
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <VcsLabel
            html-for="selectInput"
            :tooltip="$t('snowpile.typeTooltip')"
          >
            {{ $t('snowpile.type') }}
          </VcsLabel>
        </v-col>
        <v-col>
          <VcsSelect
            id="selectInput"
            :items="roofs.map((roof) => $t(`snowpile.roofTypes.${roof.i18n}`))"
            v-model="buildingType"
          />
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col>
          <VcsLabel
            html-for="numberInput"
            :tooltip="$t('snowpile.heightTooltip')"
          >
            {{ $t('snowpile.height') }}</VcsLabel
          >
        </v-col>
        <v-col>
          <VcsTextField
            id="numberInput"
            type="number"
            step="1"
            unit="m"
            v-model.number="pileHeight"
          />
        </v-col>
      </v-row>

      <v-divider :thickness="2" class="mt-2 mb-2"></v-divider>
      <VcsFormSection
        :heading="$t('snowpile.drawGeometry')"
        expandable
        start-open
        :tooltip="$t('snowpile.drawGeometryTooltip')"
      >
        <v-container class="mt-3 py-1 px-1">
          <SelectionArea @sessionstart="handleSession($event)" />
        </v-container>
      </VcsFormSection>
      <!--v-divider :thickness="2" class="mb-2"></v-divider-->
      <!--VcsFormSection
      :heading="$t('snowpile.enterGeometry')"
      expandable
      :tooltip="$t('snowpile.enterGeometryTooltip')"
    >
      <VcsTextArea
        placeholder="[
  [13.375916137434332,52.50958736153632],
  [13.376031120070795,52.50959004427611],
  [13.375970378742716,52.50978645439449]
]"
        tooltip="This is a tooltip"
        rows="6"
        v-model="manPolygon"
      />
    </VcsFormSection-->

      <v-divider :thickness="2" class="mb-2"></v-divider>
      <div class="d-flex justify-end gc-2 mt-4">
        <VcsFormButton @click="openResultWindow" :disabled="!resultsAvailable">
          {{ $t('snowpile.showResults') }}
        </VcsFormButton>
        <VcsFormButton @click="run" :disabled="!pileFeatureCollection">{{
          $t('snowpile.runAnalysis')
        }}</VcsFormButton>
      </div>
    </v-container>
  </div>
</template>
<script lang="ts">
  import { computed, defineComponent, inject, reactive, ref, watch } from 'vue';
  import { windowId } from './index.js';
  import {
    VcsUiApp,
    NotificationType,
    VcsFormSection,
    VcsLabel,
    VcsSelect,
    VcsTextField,
    VcsDatePicker,
    VcsFormButton,
    WindowSlot,
    VcsTextArea,
    getDefaultPrimaryColor,
    defaultPrimaryColor,
  } from '@vcmap/ui';
  import {
    VForm,
    VContainer,
    VRow,
    VCol,
    VSpacer,
    VDivider,
  } from 'vuetify/components';
  //import { setViewpoint, runShadowAnalysis } from './shadowmap';
  import SelectionArea, {
    areaSelectionLayerName,
    createSelectionLayerStyle,
  } from './SelectionArea.vue';
  import {
    mercatorToWgs84Transformer,
    Viewpoint,
    VectorLayer,
    mercatorProjection,
    wgs84Projection,
    parseGeoJSON,
    markVolatile,
  } from '@vcmap/core';
  import { icons } from './index.js';
  import { name } from '../package.json';
  import Feature from 'ol/Feature';
  import GeoJSON from 'ol/format/GeoJSON';
  import { createExtrudedPileGeoJSON } from './helper.js';
  import { SnowPile } from './snowmelt.js';
  import { weatherLocations } from './fetchWeatherData';
  import { predictWeatherForLocation } from './predictWeatherFromCSV.js';
  import rooftypes from './roofTypes.js';
  import snowpileResultWindow from './snowpileResultWindow.vue';
  import viewpoint from '@vcmap/core/dist/src/util/viewpoint.js';

  export default defineComponent({
    name: 'SnowpileMainWindow',
    emits: ['close'],
    components: {
      VcsFormSection,
      VcsSelect,
      VForm,
      VContainer,
      VRow,
      VCol,
      VcsLabel,
      VcsDatePicker,
      VcsFormButton,
      VcsTextArea,
      VcsTextField,
      VSpacer,
      SelectionArea,
      VDivider,
    },
    unmounted() {
      const app = inject('vcsApp') as VcsUiApp;
      const layer = app.layers.getByKey(
        String(areaSelectionLayerName),
      ) as VectorLayer;
      if (layer) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        layer.removeAllFeatures();
        app.windowManager.remove('snowpile_result_window_id');
      }
    },
    setup(props) {
      const app = inject('vcsApp') as VcsUiApp;
      const defaultPrimaryColor = getDefaultPrimaryColor(app);
      const plugin = app.plugins.getByKey(name);
      const resultsAvailable = ref(false);
      const date = ref(new Date());
      const fixedDate = ref('2025-04-03');
      const month = ref(4);
      const pileHeight = ref(10);
      const polygon = ref(null);
      const roofs = ref(rooftypes);
      const buildingType = ref('Snowpile');
      const manPolygon = ref(null);
      const pileFeatureCollection = ref(null);
      const locations = ref(weatherLocations);
      const selectedLocation = ref(weatherLocations[0].name);
      const results = ref<Array<object>>([]);
      const pile = ref(null);
      const childWindowComponent = {
        id: 'snowpile_result_window_id',
        parentId: windowId,
        component: snowpileResultWindow,
        slot: WindowSlot.DYNAMIC_CHILD,
        state: {
          headerTitle: 'snowpile.resultWindow.title',
          headerIcon: icons[1].icon,
          infoUrl: 'https://vc.systems/help/pluginExample',
        },

        position: {
          width: '650px',
          // left and top will be overwritten by the derived child position next to its parent
        },
        props: {
          results: results,
          feature: pile.value,
        },
      };

      function openResultWindow() {
        app.windowManager.add(childWindowComponent, name);
      }
      function createDateString(days: number): string {
        const baseDate = new Date(fixedDate.value);
        baseDate.setDate(baseDate.getDate() + days);
        return baseDate.toISOString().split('T')[0];
      }

      function run() {
        if (pileFeatureCollection.value) {
          const layer = app.layers.getByKey(
            String(areaSelectionLayerName),
          ) as VectorLayer;

          const snowPile = new SnowPile(
            pileFeatureCollection.value.features[0].properties.Volume,
            pileHeight.value,
          );
          let geojson = JSON.parse(JSON.stringify(pileFeatureCollection.value));
          childWindowComponent.props.feature = JSON.parse(
            JSON.stringify(pileFeatureCollection.value),
          );
          // Run the melt simulation
          let days = 0;

          const loc = locations.value.find(
            (l) => l.name === selectedLocation.value,
          );

          while (snowPile.remainingSnow > 0 && snowPile.scaleFactor >= 0.01) {
            const date = createDateString(days);
            // Find the weather prediction, but do not use destructured values if not needed
            const weather = predictWeatherForLocation(
              loc?.name.toLowerCase(),
              // Add 'days' to the fixedDate before passing to predictWeatherForLocation
              date,
            );
            snowPile.calculateDailyMelt(
              weather?.temperature_2m_max,
              weather?.precipitation_sum,
              weather?.sunshine_duration,
            );

            if (snowPile.scaleFactor >= 0.01) {
              results.value.push({
                day: date,
                remainingSnow: snowPile.remainingSnow,
                remainingHeight: snowPile.remainingHeight,
                volume: snowPile.currentVolume,
                currentMeltwater: snowPile.currentMeltWater,
                totalMeltWater: snowPile.totalMeltWater,
                temperature: weather?.temperature_2m_max,
                precipitation: weather?.precipitation_sum,
                sunshineDuration: weather?.sunshine_duration,
              });

              days++;
            }
            if (days >= 365) {
              console.warn(
                'Simulation stopped after 365 days to prevent infinite loop.',
              );
              resultsAvailable.value = true;
              break;
            }
            if (snowPile.remainingSnow < 0 || snowPile.scaleFactor <= 0.01) {
              results.value.push({
                day: date,
                remainingSnow: snowPile.remainingSnow,
                remainingHeight: snowPile.remainingHeight,
                volume: snowPile.currentVolume,
                currentMeltwater: snowPile.currentMeltWater,
                totalMeltWater: snowPile.totalMeltWater,
                temperature: weather?.temperature_2m_max,
                precipitation: weather?.precipitation_sum,
                sunshineDuration: weather?.sunshine_duration,
                pile: geojson,
              });
              resultsAvailable.value = true;
              console.log(
                `Day ${days}: Remaining snow:`,
                snowPile.remainingSnow,
              );
              console.log(
                `Simulation stopped after ${days} days due to insufficient snow.`,
              );
            }
          }
        }
      }

      Date.prototype.addHours = function (h) {
        this.setHours(this.getHours() + h);
        return this;
      };

      // Helper: Create OpenLayers features from GeoJSON
      function createOLFeaturesFromGeoJSON(geojson: any) {
        // Use ol/format/GeoJSON to parse
        // @ts-ignore
        const format = new GeoJSON();
        // Note: OpenLayers expects 2D by default, but can handle 3D coordinates for visualization/analysis
        return format.readFeatures(geojson, {
          dataProjection: wgs84Projection.epsg,
          featureProjection: mercatorProjection.epsg,
        });
      }

      /**
       * Increases the step of VcsWizard if the feature create session was successful.
       * @param {Promise<import("ol").Feature<import("ol/geom/Geometry").default> | null>} session The result of the area selection create feature session.
       */
      async function handleSession(session: Promise<unknown>): Promise<void> {
        const layer = app.layers.getByKey(
          String(areaSelectionLayerName),
        ) as VectorLayer;
        if (layer) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          layer.removeAllFeatures();
          results.value = [];
          resultsAvailable.value = false;
          pileFeatureCollection.value = null;
          polygon.value = null;
          app.windowManager.remove(childWindowComponent.id);
        }

        const feature = (await session) as Feature;

        if (feature) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          polygon.value = feature;

          const geometry = feature.getGeometry();
          const coords = geometry.getCoordinates()[0];
          /*           manPolygon.value = JSON.stringify(
                  Projection.transformCoordinates(
                    wgs84Projection,
                    mercatorProjection,
                    coords,
                  ),
                ); */
          const extent = geometry.getExtent();

          const wgs84Extent = mercatorToWgs84Transformer(extent);
          viewpoint.value = Viewpoint.createViewpointFromExtent(wgs84Extent);

          // --- HIP ROOF BUILDING GENERATION ---
          // Use mercator coordinates for 3D geometry
          pileFeatureCollection.value = createExtrudedPileGeoJSON(
            coords,
            pileHeight.value,
            feature.getProperty('geometryType'),
            buildingType.value,
            geometry.getArea(),
          );
          //console.log('Generated GeoJSON:', pileFeatureCollection.value);

          const olFeatures = createOLFeaturesFromGeoJSON(
            pileFeatureCollection.value,
          );

          // Replace the drawn polygon with the new building features
          if (layer) {
            layer.removeAllFeatures();
            // @ts-ignore: addFeatures expects an array of ol.Feature
            layer.addFeatures(olFeatures);
          }
        }
      }
      async function getAreaSelectionLayer(): Promise<VectorLayer> {
        if (!app.layers.hasKey(String(areaSelectionLayerName))) {
          const primary =
            app.uiConfig.config.primaryColor ?? defaultPrimaryColor;
          const style = createSelectionLayerStyle(primary);
          const layer = new VectorLayer({
            name: String(areaSelectionLayerName),
            projection: mercatorProjection.toJSON(),
            style,
          });
          markVolatile(layer);
          app.layers.add(layer);
        }
        const vcsLayer = app.layers.getByKey(
          String(areaSelectionLayerName),
        ) as VectorLayer;
        await vcsLayer.activate();
        return vcsLayer;
      }

      watch(
        () => manPolygon.value,
        async (manPolygon) => {
          if (manPolygon) {
            const layer = await getAreaSelectionLayer();
            if (layer) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              layer.removeAllFeatures();
            }

            const feature = parseGeoJSON({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [JSON.parse(manPolygon)],
              },
            });
            polygon.value = feature.features[0];
            layer.addFeatures(feature.features);
            const geometry = polygon.value.getGeometry();
            const extent = geometry.getExtent();
            const wgs84Extent = mercatorToWgs84Transformer(extent);
            viewpoint.value = Viewpoint.createViewpointFromExtent(wgs84Extent);
            await app.maps.activeMap.gotoViewpoint(viewpoint.value);
          } else {
            const d = new Date().addHours(2);
            fixedDate.value = d.toISOString().split('T')[0];
          }
        },
        { immediate: true },
      );
      return {
        openResultWindow,
        resultsAvailable,
        pileFeatureCollection,
        locations,
        selectedLocation,
        manPolygon,
        date,
        pileHeight,
        roofs,
        buildingType,
        run,
        handleSession,
      };
    },
  });
</script>
