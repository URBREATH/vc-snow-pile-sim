<template>
  <v-container>
    <v-row no-gutters class="mt-2">
      <div ref="meltwaterChartRef" style="height: 300px; width: 98%"></div>
    </v-row>
    <v-row no-gutters class="mt-2">
      <div ref="weatherChartRef" style="height: 300px; width: 98%"></div>
    </v-row>
    <v-divider :thickness="1" class="mb-4"></v-divider>
    <div class="d-flex justify-end gc-2">
      <VcsFormButton
        @click="openUploadDialog"
        icon="$vcsUpload"
        v-if="minioUploadEnabled"
      >
        {{ $t('snowpile.resultWindow.uploadButton') }}
      </VcsFormButton>
      <VcsFormButton
        @click="dialog = true"
        :icon="pdfCreationRunning ? '$vcsProgress' : icons[2].icon"
        :tooltip="$t('snowpile.resultWindow.exportButtonTooltip')"
      >
        {{ $t('snowpile.resultWindow.exportButton') }}
      </VcsFormButton>
      <v-dialog v-model="dialog" width="auto">
        <v-card
          max-width="450"
          prepend-icon="$vcsInfo"
          :text="$t('snowpile.resultWindow.overlayText')"
          :title="$t('snowpile.resultWindow.overlayTitle')"
        >
          <v-row class="ml-2 mr-2">
            <v-col cols="5">
              <VcsLabel html-for="prependedInput">
                {{ $t('snowpile.resultWindow.overlayButtonLabel') }}
              </VcsLabel>
            </v-col>
            <v-col>
              <VcsTextField
                id="prependedInput"
                :prepend-icon="icons[2].icon"
                v-model="filename"
                :label="$t('snowpile.resultWindow.overlayButtonLabel')"
              />
            </v-col>
          </v-row>
          <v-row class="ml-2 mr-2">
            <v-col cols="11">
              <VcsCheckbox
                id="checkboxInput"
                :label="$t('snowpile.resultWindow.exportImagesLabel')"
                :tooltip="$t('snowpile.resultWindow.exportImagesTooltip')"
                v-model="exportImages"
              />
            </v-col>
          </v-row>

          <template v-slot:actions>
            <VcsFormButton
              @click="
                dialog = false;
                exportPDF(true);
                exportCSV();
              "
              >OK</VcsFormButton
            >
          </template>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>
<script lang="ts">
  import {
    computed,
    defineComponent,
    getCurrentInstance,
    inject,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
    watch,
  } from 'vue';
  import {
    VcsFormButton,
    VcsUiApp,
    VcsTextField,
    VcsLabel,
    VcsCheckbox,
  } from '@vcmap/ui';
  import {
    VSheet,
    VCol,
    VRow,
    VContainer,
    VDivider,
    VDialog,
    VCard,
    VCardTitle,
    VCardText,
    VCardActions,
    VSpacer,
    VIcon,
  } from 'vuetify/components';
  import { icons } from './index.js';
  import { jsPDF, jsPDFOptions } from 'jspdf';
  import { autoTable } from 'jspdf-autotable';
  import { VCS_LOGO_PNG, urbreath_logo } from './assets/images.js';
  import { recolorTransparentImageAsync, transText } from './pdfHelper.js';
  import {
    TITILIUMWEB_BOLD,
    TITILIUMWEB_REGULAR,
  } from './assets/titiliumweb.js';
  import ApexCharts from 'apexcharts';

  import {
    CesiumMap,
    mercatorProjection,
    wgs84Projection,
    Projection,
    GeoJSONLayer,
  } from '@vcmap/core';
  import Feature from 'ol/Feature';
  import GeoJSON from 'ol/format/GeoJSON';
  import layer from 'ol/layer/Layer.js';
  import { area } from '@turf/turf';

  import type { SnowpilePlugin } from './index.js';
  import { name } from '../package.json';

  export default defineComponent({
    name: 'shadowResultWindow',
    components: {
      VcsFormButton,
      VSheet,
      VCol,
      VRow,
      VContainer,
      VDivider,
      VDialog,
      VCard,
      VCardTitle,
      VCardText,
      VCardActions,
      VSpacer,
      VcsTextField,
      VcsLabel,
      VcsCheckbox,
      VIcon,
    },
    props: {
      results: {
        type: Object,
        required: true,
      },
      feature: {
        type: Object,
        required: true,
      },
    },
    setup(props) {
      const results = props.results.value;
      const app: VcsUiApp = inject<VcsUiApp>('vcsApp')!;
      const { config } = app.plugins.getByKey(name) as SnowpilePlugin;
      const dialog = ref(false);
      const filename = ref('snowpileAnalysis');
      const currentDate = new Intl.DateTimeFormat(app.locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());
      const primaryColor =
        app.vuetify.theme.computedThemes.value.light.colors.primary;
      const onPrimaryColor =
        app.vuetify.theme.computedThemes.value.light.colors['on-primary'];
      const black = '#000000';
      const grey = '#EBEBEB';
      const darkGrey = '#888888';
      const darkGrey2 = '#5E5E5E';
      const blue = '#28a5de';
      const graphImage = ref<string | null>(null);
      const exportImages = ref(false);
      const pdfCreationRunning = ref(false);
      const vm = getCurrentInstance();
      const defaultUploadSuffix = computed(() => {
        return 'Simulation';
      });

      // --- SNOWPILE CHART DATA ---
      // Get all years in the results
      const years = computed(() => {
        const yearSet = new Set<string>();
        props.results.value.forEach((r: any) => {
          const d = new Date(r.day);
          if (!isNaN(d.getTime())) {
            yearSet.add(d.getFullYear().toString());
          } else {
            // fallback: try splitting string
            const parts = r.day.split('-');
            if (parts.length === 3) {
              yearSet.add(parts[0]);
            }
          }
        });
        return Array.from(yearSet).sort();
      });
      // Chart title with year or year range
      const chartYear = computed(() => {
        if (years.value.length === 1) {
          return years.value[0];
        } else if (years.value.length > 1) {
          return `${years.value[0]} - ${years.value[years.value.length - 1]}`;
        }
        return '';
      });
      const meltwaterChartTitle = computed(
        () => transText(vm, 'snowpile.graph1.graphTitle'), // + chartYear.value,
      );
      const weatherChartTitle = computed(
        () => transText(vm, 'snowpile.graph2.graphTitle'), // + chartYear.value,
        //`Weather conditions: ${chartYear.value}`,
      );

      const meltwaterChartRef = ref(null);
      const weatherChartRef = ref(null);
      const meltwaterChart = ref<ApexCharts | null>(null);
      const weatherChart = ref<ApexCharts | null>(null);

      // Meltwater data series
      const meltwaterSeries = computed(() => [
        {
          name: transText(vm, 'snowpile.graph1.yaxisTitle'),
          data: props.results.value.map((r: any) => ({
            x: r.day,
            y: r.currentMeltwater,
          })),
        },
      ]);
      // Weather data series
      const weatherSeries = computed(() => [
        {
          name: transText(vm, 'snowpile.graph2.yaxisTitle1'),
          data: props.results.value.map((r: any) => ({
            x: r.day,
            y: r.temperature,
          })),
        },
        {
          name: transText(vm, 'snowpile.graph2.yaxisTitle2'),
          data: props.results.value.map((r: any) => ({
            x: r.day,
            y: r.precipitation,
          })),
        },
        {
          name: transText(vm, 'snowpile.graph2.yaxisTitle3'),
          data: props.results.value.map((r: any) => ({
            x: r.day,
            y: r.sunshineDuration,
          })),
        },
      ]);
      const baseChartOptions = {
        chart: {
          type: 'line',
          height: 300,
          toolbar: { show: true },
          zoom: { enabled: true },
          animations: { enabled: false },
        },
        xaxis: {
          type: 'datetime',
          title: { text: transText(vm, 'snowpile.graph2.xaxisTitle') },
          labels: {
            rotate: -45,
            datetimeFormatter: {
              day: 'dd.MM',
              month: 'MM.yyyy',
              year: 'yyyy',
            },
            showDuplicates: false,
            hideOverlappingLabels: true,
            // Let ApexCharts auto-pick label intervals
          },
          tickAmount: 'dataPoints', // Let ApexCharts decide, but can be set to a number if needed
        },
        yaxis: {
          title: { text: 'Value' },
          labels: {
            formatter: (val: number) => val.toFixed(2),
          },
        },
        tooltip: { shared: true, intersect: false },
        legend: { position: 'top' },
      };
      onMounted(() => {
        if (meltwaterChartRef.value) {
          meltwaterChart.value = new ApexCharts(meltwaterChartRef.value, {
            ...baseChartOptions,
            series: meltwaterSeries.value,
            chart: {
              ...baseChartOptions.chart,
              id: 'meltwaterChart',
              group: 'syncedGroup',
            },
            title: {
              text: meltwaterChartTitle.value,
              align: 'center',
              style: { fontSize: '18px', fontWeight: 600 },
            },
            subtitle: {
              text: chartYear.value,
              align: 'center',
              style: { fontSize: '14px', fontWeight: 600 },
            },
            yaxis: {
              title: { text: transText(vm, 'snowpile.graph1.yaxisTitle') },
              labels: { formatter: (val: number) => val.toFixed(2) },
            },
          });
          meltwaterChart.value.render();
        }
        if (weatherChartRef.value) {
          weatherChart.value = new ApexCharts(weatherChartRef.value, {
            ...baseChartOptions,
            series: weatherSeries.value,
            chart: {
              ...baseChartOptions.chart,
              id: 'weatherChart',
              group: 'syncedGroup',
            },
            title: {
              text: weatherChartTitle.value,
              align: 'center',
              style: { fontSize: '18px', fontWeight: 600 },
            },
            subtitle: {
              text: chartYear.value,
              align: 'center',
              style: { fontSize: '14px', fontWeight: 600 },
            },
            yaxis: {
              title: { text: transText(vm, 'snowpile.graph2.yaxisTitle') },
              labels: { formatter: (val: number) => val.toFixed(2) },
            },
          });
          weatherChart.value.render();
        }
      });
      onBeforeUnmount(() => {
        if (meltwaterChart.value) meltwaterChart.value.destroy();
        if (weatherChart.value) weatherChart.value.destroy();
      });
      async function getImageFromCesium(
        map: CesiumMap,
      ): Promise<HTMLCanvasElement> {
        const { scene } = map.getCesiumWidget()!;

        return new Promise((resolve) => {
          const removePreListener = scene.preUpdate.addEventListener(() => {
            const { canvas } = scene;
            const removePostListener = scene.postRender.addEventListener(() => {
              resolve(canvas);
              removePostListener();
            });
            removePreListener();
          });
        });
      }

      function captureCroppedCanvasScreenshot(
        canvas: HTMLCanvasElement,
        targetWidth: number,
        targetHeight: number,
      ): string {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = targetWidth;
        offscreenCanvas.height = targetHeight;

        const offscreenContext = offscreenCanvas.getContext('2d');
        if (!offscreenContext) {
          throw new Error('Unable to get canvas 2D context.');
        }

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;

        const originalAspect = originalWidth / originalHeight;
        const targetAspect = targetWidth / targetHeight;

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = originalWidth;
        let sourceHeight = originalHeight;

        if (originalAspect > targetAspect) {
          sourceWidth = originalHeight * targetAspect;
          sourceX = (originalWidth - sourceWidth) / 2;
        } else {
          sourceHeight = originalWidth / targetAspect;
          sourceY = (originalHeight - sourceHeight) / 2;
        }

        offscreenContext.drawImage(
          canvas,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          targetWidth,
          targetHeight,
        );

        return offscreenCanvas.toDataURL('image/png');
      }
      function exportCSV() {
        // Prepare CSV header
        const header = [
          transText(vm, 'snowpile.pdf.tableHeader.col0'),
          transText(vm, 'snowpile.pdf.tableHeader.col1'),
          transText(vm, 'snowpile.pdf.tableHeader.col2'),
          transText(vm, 'snowpile.pdf.tableHeader.col3'),
          transText(vm, 'snowpile.pdf.tableHeader.col4'),
          'polygonGeometry',
        ];
        // Prepare CSV rows
        const rows = props.results.value.map((item, index) => [
          item.day,
          item.remainingSnow?.toFixed(2),
          item.remainingHeight?.toFixed(2),
          item.currentMeltwater?.toFixed(2),
          item.totalMeltWater?.toFixed(2),
          item.temperature?.toFixed(2),
          item.precipitation?.toFixed(2),
          item.sunshineDuration?.toFixed(2),
          /* new Date(props.date).toLocaleDateString(app.locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
          }),
          new Date(item.day).toLocaleTimeString(app.locale, {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
          }),
          item.y.toFixed(1),
          (area * (item.y / 100)).toFixed(2),
          (tempValues.value[index]?.y || 0).toFixed(1),
          exportGeometry, */
        ]);
        // Combine header and rows
        const csvContent = [header, ...rows]
          .map((row) =>
            row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'),
          )
          .join('\r\n');
        // Create blob and trigger download
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const now = new Date();
        const dateTimeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const filename = `snowpileMelt-${dateTimeString}.csv`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      async function exportPDF(fileoutput: boolean): Promise<{
        blob: Blob;
        filename: string;
        date: string;
      } | null> {
        pdfCreationRunning.value = true;
        const lastPageImageString = await recolorTransparentImageAsync(
          urbreath_logo,
          blue, //primaryColor,
        );
        const firstPageImageString = await recolorTransparentImageAsync(
          urbreath_logo,
          blue, //onPrimaryColor,
        );
        // --- Prepare chart images ---
        const meltwaterChartImg = await meltwaterChart.value?.dataURI();
        const weatherChartImg = await weatherChart.value?.dataURI();

        // --- Prepare factsheet values ---
        const totalVolume = props.results.value.reduce(
          (sum, r) => sum + (r.volume || 0),
          0,
        );
        const totalDays = props.results.value.length;
        const meanCurrentMeltwater =
          props.results.value.reduce(
            (sum, r) => sum + (r.currentMeltwater || 0),
            0,
          ) / (totalDays || 1);
        const totalMeltWater = props.results.value.reduce(
          (sum, r) => sum + (r.totalMeltWater || 0),
          0,
        );

        // --- PDF Setup ---
        const options: jsPDFOptions = {
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
          putOnlyUsedFonts: true,
        };
        const doc = new jsPDF(options);
        doc.setFillColor(grey);
        doc.addFileToVFS('TitilliumWeb-Regular.ttf', TITILIUMWEB_REGULAR);
        doc.addFont('TitilliumWeb-Regular.ttf', 'Titillium Web', 'normal');
        doc.addFileToVFS('TitilliumWeb-Bold.ttf', TITILIUMWEB_BOLD);
        doc.addFont('TitilliumWeb-Bold.ttf', 'Titillium Web', 'bold');

        // first page
        doc.rect(0, 0, 210, 200, 'F');
        doc.addImage(
          firstPageImageString,
          'png',
          15,
          15,
          185,
          45,
          undefined,
          'FAST',
        );
        doc.setFont('Titillium Web', 'bold');
        doc.setTextColor(blue);
        doc.setFontSize(80);
        doc.text(
          app.uiConfig.getByKey('appTitle').value.toUpperCase(),
          20,
          190,
        );
        doc.setTextColor(darkGrey2);
        doc.setFontSize(36);
        doc.text(
          transText(vm, 'snowpile.pdf.titlePage.subTitle').toUpperCase(),
          20,
          220,
        );
        doc.setFont('Titillium Web', 'normal');
        doc.setFontSize(20);
        doc.text(transText(vm, 'snowpile.pdf.titlePage.subTitle2'), 20, 240);
        doc.setDrawColor(blue);
        doc.setLineWidth(1);
        doc.line(20, 250, 50, 250);
        doc.setFont('Titillium Web', 'normal');
        doc.setTextColor(134, 134, 134);
        doc.setFontSize(16);
        doc.setTextColor(blue);
        doc.text(transText(vm, 'snowpile.pdf.titlePage.dateTitle'), 20, 257);
        doc.setFontSize(20);
        doc.text(currentDate, 20, 265);

        if (exportImages.value) {
          doc.addPage();

          // --- Meltwater Chart Page ---
          doc.setFontSize(18);
          doc.setTextColor(blue);
          doc.text(meltwaterChartTitle.value, 20, 20);
          if (meltwaterChartImg?.imgURI) {
            doc.addImage(meltwaterChartImg.imgURI, 'PNG', 20, 30, 170, 80);
          }
          //doc.addPage();

          // --- Weather Chart Page ---
          doc.setFontSize(18);
          doc.setTextColor(blue);
          doc.text(weatherChartTitle.value, 20, 120);
          if (weatherChartImg?.imgURI) {
            doc.addImage(weatherChartImg.imgURI, 'PNG', 20, 140, 170, 80);
          }
        }

        // --- Table Page ---
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(blue);
        doc.text('Snowpile Melt Results', 20, 20);
        autoTable(doc, {
          head: [
            [
              transText(vm, 'snowpile.pdf.tableHeader.col0'),
              transText(vm, 'snowpile.pdf.tableHeader.col1'),
              transText(vm, 'snowpile.pdf.tableHeader.col2'),
              transText(vm, 'snowpile.pdf.tableHeader.col3'),
              transText(vm, 'snowpile.pdf.tableHeader.col4'),
              transText(vm, 'snowpile.pdf.tableHeader.col5'),
              transText(vm, 'snowpile.pdf.tableHeader.col6'),
              transText(vm, 'snowpile.pdf.tableHeader.col7'),
            ],
          ],
          body: props.results.value.map((r: any) => [
            r.day,
            r.remainingSnow?.toFixed(2),
            r.remainingHeight?.toFixed(2),
            r.currentMeltwater?.toFixed(2),
            r.totalMeltWater?.toFixed(2),
            r.temperature?.toFixed(2),
            r.precipitation?.toFixed(2),
            r.sunshineDuration?.toFixed(2),
          ]),
          startY: 30,
          margin: { left: 10, right: 10 },
          styles: { font: 'Titillium Web', fontSize: 10 },
          headStyles: { fillColor: blue, textColor: darkGrey },
          theme: 'striped',
        });
        doc.addPage();

        // --- Factsheet Page ---
        doc.setFontSize(18);
        doc.setTextColor(blue);
        doc.text('Factsheet', 20, 20);
        doc.setFontSize(14);
        doc.setTextColor(black);
        doc.text(`Total volume of snow: ${totalVolume.toFixed(2)} m³`, 20, 40);
        doc.text(`Total days for melting: ${totalDays}`, 20, 55);
        doc.text(
          `Mean current meltwater: ${meanCurrentMeltwater.toFixed(2)} m³`,
          20,
          70,
        );
        doc.text(`Total meltwater: ${totalMeltWater.toFixed(2)} m³`, 20, 85);
        // You can add icons here using doc.addImage if you have icon images

        // last page
        doc.addPage();
        doc.setFillColor(grey);
        doc.rect(0, 0, 210, 115, 'F');
        doc.setFontSize(10);
        doc.setTextColor(darkGrey);
        doc.text(currentDate, 20, 8, {
          align: 'left',
        });
        doc.text(transText(vm, 'snowpile.pdf.titlePage.subTitle'), 200, 8, {
          align: 'right',
        });

        doc.addImage(
          lastPageImageString,
          'png',
          100,
          30,
          100,
          25,
          undefined,
          'FAST',
        );
        doc.setDrawColor(blue);
        doc.setLineWidth(1);
        doc.line(20, 120, 50, 120);
        doc.setTextColor(blue);
        doc.setFontSize(48);
        doc.setFont('Titillium Web', 'bold');
        doc.text(transText(vm, 'snowpile.pdf.lastPage.title'), 20, 140);
        doc.setTextColor(black);
        doc.setFont('Titillium Web', 'normal');
        doc.setFontSize(10);
        doc.text(
          doc.splitTextToSize(transText(vm, 'snowpile.pdf.lastPage.text'), 170),
          20,
          150,
          { lineHeightFactor: 1.5 },
        );

        // global
        const totalPages = doc.getNumberOfPages();
        doc.setFont('Titillium Web', 'normal');
        doc.setFontSize(10);
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setTextColor(darkGrey);
          if (i !== 1 && i !== totalPages) {
            doc.setFont('Titillium Web', 'normal');
            doc.text(
              transText(vm, 'snowpile.pdf.page') + `: ${i} / ${totalPages}`,
              190,
              285,
              { align: 'right' },
            );
          }
          doc.setFont('Titillium Web', 'bold');
          doc.text(app.uiConfig.getByKey('appTitle').value, 20, 280);
          doc.setFont('Titillium Web', 'normal');
          doc.text(
            'URBREATH is co-funded by the European Union under grant agreement ID 101139711.',
            20,
            285,
          );
        }

        // --- Save PDF ---
        /*         const year = chartYear.value || new Date().getFullYear();
        doc.save(`snowpileMelt-${year}.pdf`);
        pdfCreationRunning.value = false; */

        // save the doc
        //const date = currentDate.replaceAll('/', '-').replaceAll('.', '-');
        const now = new Date();
        const dateTimeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const filename = `snowpileMelt-${dateTimeString}.pdf`;
        if (fileoutput) {
          doc.save(filename);
        }

        // Return the PDF blob and filename for potential upload
        const pdfBlob = doc.output('blob');
        reportResult.value = {
          blob: pdfBlob,
          filename,
          date: dateTimeString,
        };
        pdfCreationRunning.value = false;
        return { blob: pdfBlob, filename, date: dateTimeString };
      }
      return {
        closeSelf(): void {
          app.windowManager.remove(props.id);
        },
        exportCSV,
        exportPDF,

        icons,
        pdfCreationRunning,
        dialog,
        filename,
        exportImages,
        meltwaterChartRef,
        weatherChartRef,
        meltwaterChartTitle,
        weatherChartTitle,
      };
    },
  });
</script>
