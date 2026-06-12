<template>
  <v-sheet class="px-1 mb-0">
    <v-input class="feature-input" :model-value="featureDrawn">
      <VcsToolButton
        v-for="(value, name) in allowedGeometries"
        :key="name"
        :icon="value"
        :active="geometryState[name]"
        :tooltip="$st('snowpile.draw.draw' + name)"
        @click="waitForGeometry(name)"
      />
      <template #message="{ message }">
        <v-tooltip
          activator=".feature-input"
          :v-if="message"
          :text="$st(message)"
          content-class="bg-error"
          location="right"
        />
      </template>
    </v-input>
  </v-sheet>
</template>

<style scoped></style>

<script lang="ts">
  import { VSheet, VInput, VTooltip } from 'vuetify/components';
  import { VcsToolButton, VcsUiApp, getDefaultPrimaryColor } from '@vcmap/ui';

  import {
    VectorLayer,
    startCreateFeatureSession,
    GeometryType,
    mercatorProjection,
    VectorStyleItem,
    markVolatile,
  } from '@vcmap/core';
  import { inject, onMounted, reactive, ref } from 'vue';
  import { Color } from '@vcmap-cesium/engine';
  import { windowId } from './index.js';

  export const areaSelectionLayerName = Symbol('areaSelection');

  /**
   * Allowed geometry types for area selection. Key is the a value of {@link GeometryType}, value the corresponding VCS icon.
   * @type {Object<string, string>}
   */
  const allowedGeometries = {
    Polygon: '$vcsTriangle',
    BBox: '$vcsBoundingBox',
  };

  /** The state for each geometry type if create feature session is active. Key is the a value of {@link GeometryType}. */
  const geometryState = reactive({
    Polygon: false,
    BBox: false,
  });

  export function createSelectionLayerStyle(color: string): VectorStyleItem {
    return new VectorStyleItem({
      fill: {
        color: Color.fromCssColorString(color)
          .withAlpha(0.3)
          .toCssColorString(),
      },
      stroke: {
        color,
        width: 2,
      },
    });
  }

  /**
   * @description Component for drawing a selection area.
   * @vue-event {Promise<import("ol").Feature | null} sessionstart - Emits Promise that resolves with drawn feature.
   */
  export default {
    name: 'SelectionArea',
    components: { VcsToolButton, VSheet, VInput, VTooltip },
    emits: ['sessionstart'],
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    setup(
      _props,
      { emit }: { emit: (event: 'sessionstart', ...args: unknown[]) => void },
    ) {
      const app = inject('vcsApp') as VcsUiApp;
      const defaultPrimaryColor = getDefaultPrimaryColor(app);
      /** State if there exists currently an area selection feature. */
      const featureDrawn = ref(false);

      /**
       * @returns {import("@vcmap/core").VectorLayer}
       */
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

      const listeners = [
        app.uiConfig.added.addEventListener(async (item) => {
          if (item?.name === 'primaryColor') {
            (await getAreaSelectionLayer()).setStyle(
              createSelectionLayerStyle(item.value as string),
            );
          }
        }),
        app.uiConfig.removed.addEventListener(async (item) => {
          if (item?.name === 'primaryColor') {
            (await getAreaSelectionLayer()).setStyle(
              createSelectionLayerStyle(defaultPrimaryColor),
            );
          }
        }),
      ];

      /**
       * Handles the geometry creation with the @vcmap/core editor.
       * @param {string} geometryType Value of {@link GeometryType}
       */
      async function waitForGeometry(
        geometryType: 'Polygon' | 'BBox',
      ): Promise<void> {
        const layer = await getAreaSelectionLayer();
        if (layer) {
          //layer.removeAllFeatures();
          featureDrawn.value = false;
        }
        const session = startCreateFeatureSession(
          app,
          layer,
          GeometryType[geometryType],
        );

        emit(
          'sessionstart',
          new Promise((resolve) => {
            let feature: unknown = null;
            session.stopped.addEventListener(() => {
              geometryState[geometryType] = false;
              feature.set('geometryType', geometryType);
              resolve(feature); // may be null if finished before feature was valid
            });

            session.creationFinished.addEventListener((f) => {
              if (f) {
                feature = f;
                feature.set('geometryType', geometryType);
                session.stop();
                featureDrawn.value = true;
              }
            });
          }),
        );
        geometryState[geometryType] = true;
      }

      onMounted(async () => {
        const layer = getAreaSelectionLayer(); // makes sure that layer exists and is active
        featureDrawn.value = (await layer).getFeatures().length !== 0;
      });

      app.windowManager.removed.addEventListener(async ({ id }) => {
        if (id === windowId) {
          (await getAreaSelectionLayer()).deactivate();
          listeners.forEach((listener) => listener());
        }
      });
      return {
        waitForGeometry,
        allowedGeometries,
        geometryState,
        featureDrawn,
      };
    },
  };
</script>
