<template>
  <div
    class="
      py-2
      h-full
      flex
      justify-between
      flex-col
      bg-gray-50
      dark:bg-gray-900
      relative
      border-r border-gray-100
      dark:border-gray-800
    "
    :class="{
      'window-drag': platform === 'Mac',
    }"
  >
    <div>
      <!-- Company name -->
      <div
        class="px-4 flex flex-row items-center justify-between mb-6"
        :class="
          platform === 'Mac' && languageDirection === 'ltr' ? 'mt-10' : 'mt-2'
        "
      >
        <h6
          data-testid="company-name"
          class="
            font-semibold
            dark:text-gray-200
            whitespace-nowrap
            overflow-auto
            no-scrollbar
            select-none
            text-xl
            tracking-tight
          "
        >
          {{ companyName }}
        </h6>
      </div>

      <!-- Sidebar Items -->
      <div v-for="group in groups" :key="group.label">
        <div
          class="
            px-4
            py-2
            flex
            items-center
            cursor-pointer
            rounded-lg
            transition-all
            duration-200
            hover:bg-gray-100
            dark:hover:bg-gray-800
            hover:translate-x-1 hover:scale-105 hover:shadow-sm
          "
          :class="
            isGroupActive(group) && !group.items
              ? 'bg-gray-100 dark:bg-gray-800 border-s-4 border-green-500 dark:border-green-400'
              : ''
          "
          @click="routeToSidebarItem(group)"
        >
          <div class="flex items-center gap-2">
            <feather-icon
              :name="getFeatherIcon(group)"
              class="h-4 w-4 flex-shrink-0"
              :class="[
                isGroupActive(group) && !group.items
                  ? 'text-gray-900 dark:text-gray-25'
                  : 'text-gray-500 dark:text-gray-400',
                'transition-transform duration-200 hover:rotate-45',
              ]"
            />
            <div
              class="
                text-base
                font-medium
                text-gray-700
                transition-colors
                duration-200
              "
              :class="
                isGroupActive(group) && !group.items
                  ? 'text-gray-900 dark:text-gray-25'
                  : 'dark:text-gray-300'
              "
            >
              {{ group.label }}
            </div>
          </div>
        </div>

        <!-- Expanded Group -->
        <div v-if="group.items && isGroupActive(group)">
          <div
            v-for="item in group.items"
            :key="item.label"
            class="
              text-sm
              py-2
              ps-10
              cursor-pointer
              flex
              items-center
              rounded-lg
              transition-all
              duration-200
              hover:bg-gray-100
              dark:hover:bg-gray-800
              hover:translate-x-1 hover:scale-105 hover:shadow-sm
            "
            :class="
              isItemActive(item)
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-s-4 border-green-500 dark:border-green-400'
                : 'text-gray-700 dark:text-gray-400'
            "
            @click="routeToSidebarItem(item)"
          >
            <p :style="isItemActive(item) ? 'margin-left: -4px' : ''">
              {{ item.label }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Issue and DB Switcher -->
    <div class="window-no-drag flex flex-col gap-4 py-4 px-4">
      <button
        data-testid="change-db"
        class="
          flex
          text-sm text-gray-600
          dark:text-gray-500
          hover:text-gray-800
          dark:hover:text-gray-400
          gap-2
          items-center
          px-3
          py-2
          rounded-lg
          hover:bg-gray-100
          dark:hover:bg-gray-800
          transition-colors
          duration-200
        "
        @click="$emit('change-db-file')"
      >
        <feather-icon name="database" class="h-4 w-4 flex-shrink-0" />
        <p>{{ t`Change Organization` }}</p>
      </button>

      <button
        class="
          flex
          text-sm text-gray-600
          dark:text-gray-500
          hover:text-gray-800
          dark:hover:text-gray-400
          gap-2
          items-center
          px-3
          py-2
          rounded-lg
          hover:bg-gray-100
          dark:hover:bg-gray-800
          transition-colors
          duration-200
        "
        @click="viewShortcuts = true"
      >
        <feather-icon name="command" class="h-4 w-4 flex-shrink-0" />
        <p>{{ t`Shortcuts` }}</p>
      </button>

      <!-- <button
          class="
            flex
            text-sm text-gray-600
            dark:text-gray-500
            hover:text-gray-800
            dark:hover:text-gray-400
            gap-2
            items-center
            px-3
            py-2
            rounded-lg
            hover:bg-gray-100
            dark:hover:bg-gray-800
            transition-colors
            duration-200
          "
          @click="() => reportIssue()"
        >
          <feather-icon name="flag" class="h-4 w-4 flex-shrink-0" />
          <p>
            {{ t`Report Issue` }}
          </p>
        </button> -->

      <p
        v-if="showDevMode"
        class="text-xs text-gray-500 select-none cursor-pointer"
        @click="showDevMode = false"
        title="Open dev tools with Ctrl+Shift+I"
      >
        running on dev mode
      </p>
    </div>

    <!-- Hide Sidebar Button -->
    <button
      class="
        absolute
        bottom-0
        end-0
        text-gray-600
        dark:text-gray-500
        hover:bg-gray-100
        dark:hover:bg-gray-800
        rounded
        p-1
        m-4
        rtl-rotate-180
      "
      @click="() => toggleSidebar()"
    >
      <feather-icon name="chevrons-left" class="w-4 h-4" />
    </button>

    <Modal :open-modal="viewShortcuts" @closemodal="viewShortcuts = false">
      <ShortcutsHelper class="w-form" />
    </Modal>
  </div>
</template>
<script lang="ts">
import { reportIssue } from 'src/errorHandling';
import { fyo } from 'src/initFyo';
import { languageDirectionKey, shortcutsKey } from 'src/utils/injectionKeys';
import { docsPathRef } from 'src/utils/refs';
import { getSidebarConfig } from 'src/utils/sidebarConfig';
import { SidebarConfig, SidebarItem, SidebarRoot } from 'src/utils/types';
import { routeTo, toggleSidebar } from 'src/utils/ui';
import { defineComponent, inject } from 'vue';
import router from '../router';
import Icon from './Icon.vue';
import Modal from './Modal.vue';
import ShortcutsHelper from './ShortcutsHelper.vue';

const COMPONENT_NAME = 'Sidebar';

export default defineComponent({
  components: {
    Icon,
    Modal,
    ShortcutsHelper,
  },
  props: {
    darkMode: { type: Boolean, default: false },
  },
  emits: ['change-db-file', 'toggle-darkmode'],
  setup() {
    return {
      languageDirection: inject(languageDirectionKey),
      shortcuts: inject(shortcutsKey),
    };
  },
  data() {
    return {
      companyName: '',
      groups: [],
      viewShortcuts: false,
      activeGroup: null,
      showDevMode: false,
    } as {
      companyName: string;
      groups: SidebarConfig;
      viewShortcuts: boolean;
      activeGroup: null | SidebarRoot;
      showDevMode: boolean;
    };
  },
  computed: {
    appVersion() {
      return fyo.store.appVersion;
    },
  },
  async mounted() {
    const { companyName } = await fyo.doc.getDoc('AccountingSettings');
    this.companyName = companyName as string;
    this.groups = await getSidebarConfig();

    this.setActiveGroup();
    router.afterEach(() => {
      this.setActiveGroup();
    });

    this.shortcuts?.shift.set(COMPONENT_NAME, ['KeyH'], () => {
      if (document.body === document.activeElement) {
        this.toggleSidebar();
      }
    });
    this.shortcuts?.set(COMPONENT_NAME, ['F1'], () => this.openDocumentation());
    
    // Register theme toggle shortcut sequence (Ctrl+K then T)
    let ctrlKPressed = false;
    let ctrlKTimeout: number | null = null;
    
    this.shortcuts?.ctrl.set(COMPONENT_NAME, ['KeyK'], () => {
      ctrlKPressed = true;
      
      // Clear any existing timeout
      if (ctrlKTimeout) {
        clearTimeout(ctrlKTimeout);
      }
      
      // Set a timeout to reset the sequence
      ctrlKTimeout = window.setTimeout(() => {
        ctrlKPressed = false;
      }, 2000); // 2 seconds to press T after Ctrl+K
    });
    
    // Listen for T key when Ctrl+K has been pressed
    const handleTKeyPress = (e: KeyboardEvent) => {
      if (ctrlKPressed && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        ctrlKPressed = false;
        if (ctrlKTimeout) {
          clearTimeout(ctrlKTimeout);
          ctrlKTimeout = null;
        }
        // Emit event to parent to toggle theme
        this.$emit('toggle-darkmode');
      }
    };
    
    document.addEventListener('keydown', handleTKeyPress);
    
    // Clean up the event listener when component is unmounted
    const cleanup = () => {
      document.removeEventListener('keydown', handleTKeyPress);
      if (ctrlKTimeout) {
        clearTimeout(ctrlKTimeout);
      }
    };
    
    // Store the cleanup function to be called in beforeUnmount
    this._sidebarCleanup = cleanup;

    this.showDevMode = this.fyo.store.isDevelopment;
  },
  beforeUnmount() {
    // Clean up the event listener when component is unmounted
    if (this._sidebarCleanup) {
      this._sidebarCleanup();
    }
    this.shortcuts?.delete(COMPONENT_NAME);
  },
  methods: {
    getFeatherIcon(group: SidebarRoot | SidebarItem) {
      const iconMap = {
        Dashboard: 'grid',
        Accounting: 'briefcase',
        Inventory: 'archive',
        POS: 'terminal',
        Reports: 'bar-chart-2',
        Settings: 'sliders',
        Help: 'life-buoy',
        Shortcuts: 'zap',
        'Change Organization': 'repeat',
        Purchases: 'shopping-cart',
        Sales: 'trending-up',
        Common: 'layers',
        Setup: 'tool',
        'Get Started': 'gift',
      };
      return iconMap[group.label as keyof typeof iconMap] || 'folder';
    },
    routeTo,
    reportIssue,
    toggleSidebar,
    openDocumentation() {
      ipc.openLink('https://garudalinux.org/' + docsPathRef.value);
    },
    setActiveGroup() {
      const { fullPath } = this.$router.currentRoute.value;
      const fallBackGroup = this.activeGroup;
      this.activeGroup =
        this.groups.find((g) => {
          if (fullPath.startsWith(g.route) && g.route !== '/') {
            return true;
          }

          if (g.route === fullPath) {
            return true;
          }

          if (g.items) {
            let activeItem = g.items.filter(
              ({ route }) => route === fullPath || fullPath.startsWith(route)
            );

            if (activeItem.length) {
              return true;
            }
          }
        }) ??
        fallBackGroup ??
        this.groups[0];
    },
    isItemActive(item: SidebarItem) {
      const { path: currentRoute, params } = this.$route;
      const routeMatch = currentRoute === item.route;

      const schemaNameMatch =
        item.schemaName && params.schemaName === item.schemaName;

      const isMatch = routeMatch || schemaNameMatch;
      if (params.name && item.schemaName && !isMatch) {
        return currentRoute.includes(`${item.schemaName}/${params.name}`);
      }

      return isMatch;
    },
    isGroupActive(group: SidebarRoot) {
      return this.activeGroup && group.label === this.activeGroup.label;
    },
    routeToSidebarItem(item: SidebarItem | SidebarRoot) {
      routeTo(this.getPath(item));
    },
    getPath(item: SidebarItem | SidebarRoot) {
      const { route: path, filters } = item;
      if (!filters) {
        return path;
      }

      return { path, query: { filters: JSON.stringify(filters) } };
    },
  },
});
</script>