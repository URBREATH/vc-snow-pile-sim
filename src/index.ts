import {
  VcsPlugin,
  VcsUiApp,
  PluginConfigEditor,
  createToggleAction,
  ToolboxType,
  WindowSlot,
} from '@vcmap/ui';
import { DeclarativeStyleItem } from '@vcmap/core';
import type { SnowpilePluginConfig } from './defaultOptions.js';
import { getDefaultOptions } from './defaultOptions.js';
import { name, version, mapVersion } from '../package.json';
import snowpileMainWindow from './snowpileMainWindow.vue';
import de from './i18n/de.json';
import en from './i18n/en.json';
import be from './i18n/be.json';
import ro from './i18n/ro.json';
import it from './i18n/it.json';
import cz from './i18n/cz.json';
import ee from './i18n/ee.json';
import es from './i18n/es.json';
import fi from './i18n/fi.json';
import dk from './i18n/dk.json';
import gr from './i18n/gr.json';

//type PluginConfig = Record<never, never>;
type PluginState = Record<never, never>;

//type MyPlugin = VcsPlugin<PluginConfig, PluginState>;
export type SnowpilePlugin = VcsPlugin<SnowpilePluginConfig, PluginState> & {
  config: SnowpilePluginConfig;
};
export const windowId = 'snowpile_window_id';

export const icons = [
  {
    title: 'snowmelt',
    set: 'custom',
    icon: 'svgString:<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M8 17.85C8 19.04 7.11 20 6 20s-2-.96-2-2.15C4 16.42 6 14 6 14s2 2.42 2 3.85M16.46 12v-1.44l2-1.13l2.33.62l.52-1.93l-1.77-.47l.46-1.77l-1.93-.52l-.62 2.33l-2 1.13L13 7.38V5.12l1.71-1.71L13.29 2L12 3.29L10.71 2L9.29 3.41L11 5.12v2.26L8.5 8.82l-2-1.13l-.58-2.33L4 5.88l.47 1.77l-1.77.47l.52 1.93l2.33-.62l2 1.13V12H2v1h20v-1zM9.5 12v-1.44L12 9.11l2.5 1.45V12zM20 17.85c0 1.19-.89 2.15-2 2.15s-2-.96-2-2.15c0-1.43 2-3.85 2-3.85s2 2.42 2 3.85m-6 3c0 1.19-.89 2.15-2 2.15s-2-.96-2-2.15c0-1.43 2-3.85 2-3.85s2 2.42 2 3.85"/></svg>',
  },
  {
    title: 'graph',
    set: 'custom',
    icon: 'svgString:<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m16 11.78l4.24-7.33l1.73 1l-5.23 9.05l-6.51-3.75L5.46 19H22v2H2V3h2v14.54L9.5 8z"/></svg>',
  },
  {
    title: 'pdfIcon',
    set: 'custom',
    icon: 'svgString:<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="currentColor" fill-rule="evenodd" d="M161.28 328.32a61 61 0 0 0-40.32-8.32H85.333v128h28.373v-48.853h12.16a55.04 55.04 0 0 0 35.84-8.747a38.61 38.61 0 0 0 13.44-30.933a37.33 37.33 0 0 0-13.866-31.147m-22.827 46.72a32.85 32.85 0 0 1-17.067 2.56h-8.32v-36.266h8.32a30.3 30.3 0 0 1 17.494 3.413a17.49 17.49 0 0 1 7.466 15.36a15.15 15.15 0 0 1-7.893 14.933M236.16 320h-35.414v128h33.92a90.24 90.24 0 0 0 50.134-9.6a60.16 60.16 0 0 0 23.893-54.4a64 64 0 0 0-17.707-48.853A73.4 73.4 0 0 0 236.16 320m28.16 98.987a51.2 51.2 0 0 1-29.227 6.4h-5.547v-82.773h5.12c17.92 0 24.96 1.706 32 8.106a43.95 43.95 0 0 1 12.16 33.28a41.39 41.39 0 0 1-14.506 34.987M339.84 448h28.8v-53.546h58.026V371.84H368.64v-29.226h58.026V320H339.84zM320 42.667H85.333v234.667H128v-192h174.293L384 167.04v110.294h42.666v-128z"/></svg>',
  },
  {
    title: 'minioIcon',
    set: 'custom',
    icon: 'svgString:<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 106 18" fill="none" class="navbar_logo w-variant-e50a6df3-7ed9-d560-de46-856fa3fb13c1"><path d="M40.6149 0.304199H34.7266V17.6899H40.6149V0.304199Z" fill="currentColor"></path><path d="M27.4597 0.241986L15.5093 7.53878C15.3418 7.64426 15.1246 7.64426 14.9571 7.53878L3.00672 0.241986C2.75233 0.0868666 2.4545 0 2.15047 0H2.13806C1.23216 0 0.5 0.732161 0.5 1.63806V17.3671H6.38211V9.88418C6.38211 9.42503 6.88469 9.13961 7.27559 9.38159L13.9705 13.4767C14.6282 13.88 15.4597 13.8862 16.1236 13.4953L23.1908 9.35057C23.5817 9.12099 24.0781 9.40641 24.0781 9.85936V17.3671H29.9602V1.63806C29.9602 0.732161 29.228 0 28.3221 0H28.3097C28.0057 0 27.7141 0.0806618 27.4535 0.241986" fill="currentColor"></path><path d="M69.9642 0.304199H63.9953V8.21526C63.9953 8.66201 63.5237 8.94122 63.1328 8.73646L47.6581 0.496547C47.4224 0.372452 47.1556 0.304199 46.8887 0.304199H46.8763C45.9704 0.304199 45.2383 1.03636 45.2383 1.94226V17.6713H51.1576V9.76645C51.1576 9.32592 51.6292 9.0405 52.0201 9.24525L67.5506 17.4852C67.7864 17.6093 68.0532 17.6775 68.32 17.6775C69.2259 17.6775 69.958 16.9454 69.958 16.0395V0.304199H69.9642Z" fill="currentColor"></path><path d="M77.3013 0.304199H74.5898V17.6899H77.3013V0.304199Z" fill="currentColor"></path><path d="M93.242 18C85.9576 18 80.7891 14.544 80.7891 9.0031C80.7891 3.46225 85.9824 0 93.242 0C100.502 0 105.726 3.45605 105.726 8.9969C105.726 14.5377 100.619 17.9938 93.242 17.9938M93.242 2.30196C87.8253 2.30196 83.6495 4.66598 83.6495 8.9969C83.6495 13.3278 87.8253 15.6918 93.242 15.6918C98.6588 15.6918 102.866 13.3588 102.866 8.9969C102.866 4.63495 98.665 2.30196 93.242 2.30196Z" fill="currentColor"></path></svg>',
  },
];

export default function plugin(
  options: SnowpilePluginConfig,
  baseUrl: string,
): SnowpilePlugin {
  // eslint-disable-next-line no-console
  //console.log(config, baseUrl);
  const defaultOptions = getDefaultOptions();
  const config = { ...defaultOptions, ...options };
  const listeners: Array<() => void> = [];
  return {
    get name(): string {
      return name;
    },
    get version(): string {
      return version;
    },
    get mapVersion(): string {
      return mapVersion;
    },
    get config(): SnowpilePluginConfig {
      return config;
    },
    initialize(vcsUiApp: VcsUiApp, state?: PluginState): Promise<void> {
      // eslint-disable-next-line no-console
      console.log(
        'Called before loading the rest of the current context. Passed in the containing Vcs UI App ',
        vcsUiApp,
        state,
      );
      const style = {
        name: 'Waterflow',
        properties: {
          legend: [
            {
              type: 'StyleLegendItem',
              colNr: 1,
              rows: [
                {
                  type: 'FillLegendRow',
                  fill: {
                    color: '#191970',
                  },
                  title: '>= 30 (stream)',
                },
                {
                  type: 'FillLegendRow',
                  fill: {
                    color: '#0000CD',
                  },
                  title: '>= 20 (small stream)',
                },
                {
                  type: 'FillLegendRow',
                  fill: {
                    color: '#6495ED',
                  },
                  title: '>= 10 (water flow)',
                },
                {
                  type: 'FillLegendRow',
                  fill: {
                    color: '#50C878',
                  },
                  title: '= ridge or high point',
                },
                {
                  type: 'FillLegendRow',
                  fill: {
                    color: '#FF0000',
                  },
                  title: 'sink',
                },
                {
                  type: 'FillLegendRow',
                  fill: {
                    color: '#FFFFFF',
                  },
                  title: 'misc',
                },
              ],
            },
          ],
        },
        declarativeStyle: {
          show: 'true',
          color: {
            conditions: [
              ['Number(${accumulation}) >= 30', "color('#191970',1)"],
              ['Number(${accumulation}) >= 20', "color('#0000CD',1)"],
              ['Number(${accumulation}) >= 10', "color('#6495ED',0.7)"],
              ['Number(${accumulation}) === 1', "color('#50C878',1)"],
              ['${isSink}', "color('#FF0000',1)"],
              ['true', "color('#FFFFFF',1)"],
            ],
          },
          strokeColor: "color('#191970',1)",
          strokeWidth: {
            conditions: [['true', '10']],
          },
        },
      };
      const newItem = new DeclarativeStyleItem(style);
      vcsUiApp.styles.add(newItem);
      const { action, destroy } = createToggleAction(
        {
          name: 'snowpileAnalysis',
          icon: icons[0].icon,
          title: 'snowpile.title',
        },
        {
          id: windowId,
          component: snowpileMainWindow,
          state: {
            headerTitle: 'snowpile.title',
            headerIcon: icons[0].icon,
          },
          slot: WindowSlot.DYNAMIC_LEFT,
          position: {
            //height: 800,
            minWidth: 450,
          },
        },
        vcsUiApp.windowManager,
        name,
      );
      listeners.push(destroy);
      vcsUiApp.toolboxManager.add(
        { type: ToolboxType.SINGLE, id: name, action: action },
        name,
      );
      return Promise.resolve();
    },
    onVcsAppMounted(vcsUiApp: VcsUiApp): void {
      // eslint-disable-next-line no-console
      console.log(
        'Called when the root UI component is mounted and managers are ready to accept components',
        vcsUiApp,
      );
    },
    /**
     * should return all default values of the configuration
     */
    getDefaultOptions(): SnowpilePluginConfig {
      return getDefaultOptions();
    },
    /**
     * should return the plugin's serialization excluding all default values
     */
    toJSON(): SnowpilePluginConfig {
      return options;
    },
    /**
     * should return the plugins state
     * @param {boolean} forUrl
     * @returns {PluginState}
     */
    getState(forUrl?: boolean): PluginState {
      // eslint-disable-next-line no-console
      //console.log('Called when collecting state, e.g. for create link', forUrl);
      return {
        prop: '*',
      };
    },
    /**
     * components for configuring the plugin and/ or custom items defined by the plugin
     */
    getConfigEditors(): PluginConfigEditor[] {
      return [];
    },
    i18n: { en, de, be, ro, it, cz, ee, es, fi, dk, gr },
    destroy(): void {
      // eslint-disable-next-line no-console
      listeners.forEach((cb) => cb());

      //console.log('hook to cleanup');
    },
  };
}
