<template>
  <div class="h-screen dashboard-container" style="width: var(--w-desk)">
    <PageHeader :title="t`Dashboard`">
      <div
        class="
          border
          dark:border-gray-900
          rounded
          bg-gray-50
          dark:bg-gray-890
          focus-within:bg-gray-100
          dark:focus-within:bg-gray-900
          flex
          items-center
        "
      >
        <PeriodSelector
          class="px-3"
          :value="period"
          :options="['This Year', 'This Quarter', 'This Month', 'YTD']"
          @change="(value) => (period = value)"
        />
      </div>
    </PageHeader>

    <div
      class="no-scrollbar overflow-auto dark:bg-gray-875"
      style="height: calc(100vh - var(--h-row-largest) - 1px)"
    >
      <div style="min-width: var(--w-desk-fixed)" class="overflow-auto">
        <div class="flex">
          <Expenses
            class="w-full p-4 chart-animate"
            :class="{ 'animate-fade-in-up': isMounted }"
            style="animation-delay: 0.5s"
            :common-period="period"
            :dark-mode="darkMode"
            @period-change="handlePeriodChange"
          />
          <ProfitAndLoss
            class="w-full p-4 border-e dark:border-gray-800 chart-animate"
            :class="{ 'animate-fade-in-up': isMounted }"
            style="animation-delay: 0.4s"
            :common-period="period"
            :dark-mode="darkMode"
            @period-change="handlePeriodChange"
          />
        </div>
        <hr class="dark:border-gray-800" />
        <div class="flex w-full">
          <UnpaidInvoices
            :schema-name="'SalesInvoice'"
            :common-period="period"
            :dark-mode="darkMode"
            class="border-e dark:border-gray-800 chart-animate"
            :class="{ 'animate-fade-in-up': isMounted }"
            style="animation-delay: 0.2s"
            @period-change="handlePeriodChange"
          />
          <UnpaidInvoices
            :schema-name="'PurchaseInvoice'"
            :common-period="period"
            :dark-mode="darkMode"
            class="chart-animate"
            :class="{ 'animate-fade-in-up': isMounted }"
            style="animation-delay: 0.3s"
            @period-change="handlePeriodChange"
          />
        </div>
        <hr class="dark:border-gray-800" />
        <Cashflow
          class="p-4 chart-animate"
          :class="{ 'animate-fade-in-up': isMounted }"
          :common-period="period"
          :dark-mode="darkMode"
          @period-change="handlePeriodChange"
        />
        <hr class="dark:border-gray-800" />
      </div>
    </div>
  </div>
</template>

<script>
import PageHeader from 'src/components/PageHeader.vue';
import UnpaidInvoices from './UnpaidInvoices.vue';
import Cashflow from './Cashflow.vue';
import Expenses from './Expenses.vue';
import PeriodSelector from './PeriodSelector.vue';
import ProfitAndLoss from './ProfitAndLoss.vue';
import { docsPathRef } from 'src/utils/refs';

export default {
  name: 'Dashboard',
  components: {
    PageHeader,
    Cashflow,
    ProfitAndLoss,
    Expenses,
    PeriodSelector,
    UnpaidInvoices,
  },
  props: {
    darkMode: { type: Boolean, default: false },
  },
  data() {
    return {
      period: 'This Year',
      isMounted: false,
    };
  },
  activated() {
    docsPathRef.value = 'books/dashboard';
    this.isMounted = true;
  },

  mounted() {
    this.isMounted = true;
  },

  deactivated() {
    this.isMounted = false;
    docsPathRef.value = '';
  },
  methods: {
    handlePeriodChange(period) {
      if (period === this.period) {
        return;
      }

      this.period = '';
    },
  },
};
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chart-animate {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

/* Staggered animations for better visual effect */
.chart-animate:nth-child(1) {
  animation-delay: 0.1s;
}
.chart-animate:nth-child(2) {
  animation-delay: 0.2s;
}
.chart-animate:nth-child(3) {
  animation-delay: 0.3s;
}
.chart-animate:nth-child(4) {
  animation-delay: 0.4s;
}
</style>
