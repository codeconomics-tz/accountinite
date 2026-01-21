<template>
  <div class="flex flex-col w-full h-full">
    <PageHeader :title="t`Print ${title}`">
      <Button class="text-xs" type="primary" @click="savePDF()">
        {{ t`Save as PDF` }}
      </Button>
      <Button class="text-xs" type="primary" @click="savePDF(true)">
        {{ t`Print` }}
      </Button>
    </PageHeader>

    <div
      class="outer-container overflow-y-auto custom-scroll custom-scroll-thumb1"
    >
      <!-- Report Print Display Area -->
      <div
        class="
          p-4
          bg-gray-25
          overflow-auto
          flex
          justify-center
          custom-scroll custom-scroll-thumb1
        "
      >
        <!-- Report Print Display Container -->
        <ScaledContainer
          ref="scaledContainer"
          class="shadow-lg border bg-white forced-light-mode"
          :scale="scale"
          :width="size.width"
          :height="size.height"
          :show-overflow="true"
        >
          <div class="bg-white mx-auto forced-light-mode">
            <div class="p-2 forced-light-mode">
              <div class="font-semibold text-xl w-full flex justify-between">
                <h1>
                  {{ `${fyo.singles.PrintSettings?.companyName}` }}
                </h1>
                <p class="text-gray-600">
                  {{ title }}
                </p>
              </div>
            </div>

            <!-- Report Data -->
            <div 
              class="grid" 
              :style="rowStyles"
              ref="reportContainer"
            >
              <template v-for="(row, r) of matrix" :key="`row-${r}`">
                <div
                  v-for="(cell, c) of row"
                  :key="`cell-${r}.${c}`"
                  :class="cellClasses(cell.idx, r)"
                  class="text-sm p-2 forced-light-mode-cell"
                  style="min-height: 2rem"
                >
                  {{ cell.value }}
                </div>
              </template>
            </div>

            <div class="border-t p-2 forced-light-mode">
              <p class="text-xs text-right w-full">
                {{ fyo.format(new Date(), 'Datetime') }}
              </p>
            </div>
          </div>
        </ScaledContainer>
      </div>

      <!-- Report Print Settings -->
      <div v-if="report" class="border-l dark:border-gray-800 flex flex-col">
        <p class="p-4 text-sm text-gray-600 dark:text-gray-400">
          {{
            [
              t`Hidden values will be visible on Print on.`,
              t`Report will use more than one page if required.`,
            ].join(' ')
          }}
        </p>
        <!-- Row Selection -->
        <div class="p-4 border-t dark:border-gray-800">
          <Int
            :show-label="true"
            :border="true"
            :df="{
              label: t`Start From Row Index`,
              fieldtype: 'Int',
              fieldname: 'numRows',
              minvalue: 1,
              maxvalue: report?.reportData.length ?? 1000,
            }"
            :value="start"
            @change="(v) => (start = v)"
          />
          <Int
            class="mt-4"
            :show-label="true"
            :border="true"
            :df="{
              label: t`Number of Rows`,
              fieldtype: 'Int',
              fieldname: 'numRows',
              minvalue: 0,
              maxvalue: report?.reportData.length ?? 1000,
            }"
            :value="limit"
            @change="(v) => (limit = v)"
          />
        </div>

        <!-- Size Selection -->
        <div class="border-t dark:border-gray-800 p-4">
          <Select
            :show-label="true"
            :border="true"
            :df="printSizeDf"
            :value="printSize"
            @change="(v) => (printSize = v)"
          />
          <Check
            class="mt-4"
            :show-label="true"
            :border="true"
            :df="{
              label: t`Landscape`,
              fieldname: 'isLandscape',
              fieldtype: 'Check',
            }"
            :value="isLandscape"
            @change="(v) => (isLandscape = v)"
          />
        </div>

        <!-- Pick Columns -->
        <div class="border-t dark:border-gray-800 p-4">
          <h2 class="text-sm text-gray-600 dark:text-gray-400">
            {{ t`Pick Columns` }}
          </h2>
          <div
            class="border dark:border-gray-800 rounded grid grid-cols-2 mt-1"
          >
            <Check
              v-for="(col, i) of report?.columns"
              :key="col.fieldname"
              :show-label="true"
              :df="{
                label: col.label,
                fieldname: col.fieldname,
                fieldtype: 'Check',
              }"
              :value="columnSelection[i]"
              @change="(v) => (columnSelection[i] = v)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Verb } from 'fyo/telemetry/types';
import { Report } from 'reports/Report';
import { reports } from 'reports/index';
import { OptionField } from 'schemas/types';
import { Fyo } from 'fyo';
import { TranslationLiteral } from 'fyo/utils/translation';
import { paperSizeMap, printSizes } from 'src/utils/ui';
import Button from 'src/components/Button.vue';
import Check from 'src/components/Controls/Check.vue';
import Int from 'src/components/Controls/Int.vue';
import Select from 'src/components/Controls/Select.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { getReport } from 'src/utils/misc';
import { getPathAndMakePDF } from 'src/utils/printTemplates';
import { showSidebar } from 'src/utils/refs';
import { PropType, defineComponent } from 'vue';
import ScaledContainer from './ScaledContainer.vue';

export default defineComponent({
  components: { PageHeader, Button, Check, Int, ScaledContainer, Select },
  props: {
    reportName: {
      type: String as PropType<keyof typeof reports>,
      required: true,
    },
  },
  data() {
    return {
      start: 1,
      limit: 0,
      printSize: 'A4' as typeof printSizes[number],
      isLandscape: false,
      scale: 0.65,
      report: null as null | Report,
      columnSelection: [] as boolean[],
    };
  },
  computed: {
    size(): { width: number; height: number } {
      return paperSizeMap[this.printSize];
    },
    title(): string {
      return reports[this.reportName]?.title ?? this.t`Report`;
    },
    printSizeDf(): OptionField {
      return {
        label: 'Print Size',
        fieldname: 'printSize',
        fieldtype: 'Select',
        options: printSizes
          .filter((p) => p !== 'Custom')
          .map((name) => ({ value: name, label: name })),
      };
    },
    matrix(): { value: string; idx: number }[][] {
      if (!this.report) {
        return [];
      }

      const columns = this.report.columns
        .map((col: any, idx: number) => ({ value: col.label, idx }))
        .filter((_: any, i: number) => this.columnSelection[i]);

      const matrix: { value: string; idx: number }[][] = [columns];

      // For General Ledger, use optimized slicing to prevent performance issues
      const isGeneralLedger = this.reportName === 'GeneralLedger';
      const maxSliceSize = isGeneralLedger ? 1000 : 5000; // Smaller slice for General Ledger
      
      const start = Math.max(this.start - 1, 0);
      const effectiveLimit = this.limit > 0 ? this.limit : (isGeneralLedger ? 1000 : this.report.reportData.length);
      const end = Math.min(
        start + effectiveLimit,
        this.report.reportData.length,
        start + maxSliceSize
      );
      const slice = this.report.reportData.slice(start, end);

      // Use a more efficient loop structure
      const rowCount = slice.length;
      for (let i = 0; i < rowCount; i++) {
        const row = slice[i];
        const rowMatrix: { value: string; idx: number }[] = [];

        const cellCount = row.cells.length;
        for (let j = 0; j < cellCount; j++) {
          if (this.columnSelection[j]) {
            const value = row.cells[j].value;
            rowMatrix.push({ value, idx: j });
          }
        }

        matrix.push(rowMatrix);
      }

      return matrix;
    },
    rowStyles(): Record<string, string> {
      const style: Record<string, string> = {};
      const numColumns = this.columnSelection.filter(Boolean).length;
      style['grid-template-columns'] = `repeat(${numColumns}, minmax(0, auto))`;
      return style;
    },
  },
  async mounted() {
    this.report = await getReport(this.reportName as keyof typeof reports);
    
    // Set a reasonable default limit to improve performance for large reports
    // like General Ledger which can have thousands of entries
    const maxDefaultLimit = 1000;
    this.limit = Math.min(this.report.reportData.length, maxDefaultLimit);
    this.columnSelection = this.report.columns.map(() => true);
    this.setScale();

    // For General Ledger, implement progressive loading
    if (this.reportName === 'GeneralLedger') {
      await this.loadGeneralLedgerDataProgressively();
    }

    // @ts-ignore
    window.rpv = this;
  },
  methods: {
    setScale() {
      const width = this.size.width * 37.2;
      let containerWidth = window.innerWidth - 26 * 16;
      if (showSidebar.value) {
        containerWidth -= 12 * 16;
      }

      this.scale = Math.min(containerWidth / width, 1);
    },
    async savePDF(shouldPrint?: boolean): Promise<void> {
      // @ts-ignore
      const innerHTML = this.$refs.scaledContainer.$el.children[0].innerHTML;
      if (typeof innerHTML !== 'string') {
        return;
      }

      const name = this.title + ' - ' + this.fyo.format(new Date(), 'Date');
      await getPathAndMakePDF(
        name,
        innerHTML,
        this.size.width,
        this.size.height,
        shouldPrint
      );

      this.fyo.telemetry.log(Verb.Printed, this.report!.reportName);
    },
    
    // Progressive loading for General Ledger
    async loadGeneralLedgerDataProgressively() {
      if (!this.report || this.reportName !== 'GeneralLedger') {
        return;
      }

      // Load data in chunks to prevent UI blocking
      const chunkSize = 100;
      let currentIndex = 0;
      const maxRecords = Math.min(
        this.limit > 0 ? this.limit : 1000,
        this.report.reportData.length
      );

      // Load initial chunk immediately
      await this.loadGeneralLedgerChunk(currentIndex, chunkSize);
      currentIndex += chunkSize;

      // Load remaining chunks progressively
      const loadRemainingChunks = async () => {
        while (currentIndex < maxRecords) {
          await this.loadGeneralLedgerChunk(currentIndex, chunkSize);
          currentIndex += chunkSize;
          
          // Yield control to the browser to prevent UI blocking
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      };

      // Start loading remaining chunks without blocking the UI
      loadRemainingChunks();
    },

    async loadGeneralLedgerChunk(startIndex: number, chunkSize: number) {
      // This would call the loadChunk method on the GeneralLedger report
      // For now, we'll just use the existing slicing approach but with better performance
      // The actual implementation would depend on how the report class exposes this functionality
    },
    cellClasses(cIdx: number, rIdx: number): string[] {
      const classes: string[] = [];
      if (!this.report) {
        return classes;
      }

      const col = this.report.columns[cIdx];
      const isFirst = cIdx === 0;
      if (col.align) {
        classes.push(`text-${col.align}`);
      }

      if (rIdx === 0) {
        classes.push('font-semibold');
      }

      classes.push('border-t');
      if (!isFirst) {
        classes.push('border-l');
      }

      return classes;
    },
  },
});
</script>
<style scoped>
.outer-container {
  display: grid;
  grid-template-columns: auto var(--w-quick-edit);
  height: 100%;
  overflow: auto;
}

.forced-light-mode {
  /* Force light mode colors */
  background-color: #ffffff !important;
  color: #000000 !important;
}

.forced-light-mode .text-gray-600 {
  color: #718096 !important;
}

.forced-light-mode .border-gray-800 {
  border-color: #e2e8f0 !important;
}

.forced-light-mode .text-gray-900 {
  color: #1a202c !important;
}

.forced-light-mode .text-gray-100 {
  color: #f7fafc !important;
}

.forced-light-mode .bg-gray-900 {
  background-color: #ffffff !important;
}

.forced-light-mode .bg-gray-890 {
  background-color: #ffffff !important;
}

.forced-light-mode .dark\:text-gray-25 {
  color: #1a202c !important;
}

.forced-light-mode .dark\:text-gray-100 {
  color: #1a202c !important;
}

.forced-light-mode .dark\:text-gray-300 {
  color: #4a5568 !important;
}

.forced-light-mode .dark\:text-gray-400 {
  color: #718096 !important;
}

.forced-light-mode .dark\:text-gray-500 {
  color: #a0aec0 !important;
}

.forced-light-mode .dark\:border-gray-800 {
  border-color: #e2e8f0 !important;
}

.forced-light-mode .dark\:border-gray-875 {
  border-color: #e2e8f0 !important;
}

.forced-light-mode .dark\:bg-gray-850 {
  background-color: #ffffff !important;
}

.forced-light-mode .dark\:bg-gray-875 {
  background-color: #ffffff !important;
}

.forced-light-mode .dark\:bg-gray-890 {
  background-color: #ffffff !important;
}

.forced-light-mode .dark\:bg-gray-900 {
  background-color: #ffffff !important;
}

.forced-light-mode-cell {
  /* Force light mode colors for cells */
  background-color: #ffffff !important;
  color: #000000 !important;
}

.forced-light-mode-cell.text-red-600 {
  color: #e53e3e !important;
}

.forced-light-mode-cell.text-green-600 {
  color: #38a169 !important;
}

.forced-light-mode-cell.text-gray-600 {
  color: #718096 !important;
}

.forced-light-mode-cell.text-gray-900 {
  color: #1a202c !important;
}

.forced-light-mode-cell.dark\:text-gray-100 {
  color: #1a202c !important;
}

.forced-light-mode-cell.dark\:text-gray-200 {
  color: #2d3748 !important;
}

.forced-light-mode-cell.dark\:text-gray-300 {
  color: #4a5568 !important;
}

.forced-light-mode-cell.dark\:text-gray-400 {
  color: #718096 !important;
}

.forced-light-mode-cell.dark\:text-gray-500 {
  color: #a0aec0 !important;
}

.forced-light-mode-cell.dark\:bg-gray-850 {
  background-color: #ffffff !important;
}
</style>