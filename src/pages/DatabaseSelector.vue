<template>
  <div
    class="flex-1 flex justify-center items-center bg-gray-50 dark:bg-gray-900"
    :class="{
      'pointer-events-none': loadingDatabase,
      'window-drag': platform !== 'Windows',
    }"
  >
    <div
      class="
        w-full w-form
        shadow-xl
        rounded-xl
        border-2 border-blue-500
        dark:border-blue-600
        relative
        bg-white
        dark:bg-gray-800
        transition-all
        duration-300
        ease-in-out
        animate-fade-in
        max-h-[85vh]
        min-h-[500px]
        h-auto
      "
    >
      <div class="px-4 py-4">
        <h1 class="text-2xl font-semibold select-none dark:text-gray-50 font-bold">
          {{ getGreeting() }}
        </h1>
        <p class="text-gray-700 dark:text-gray-300 text-base select-none">
          {{
            t`Welcome to Accountinite!`
          }}
        </p>
      </div>


      <hr class="dark:border-gray-800" />


      <!-- new file -->
      <div
        data-testid="create-new-file"
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2 window-no-drag cursor-pointer transition-all duration-300 ease-in-out"
        :class="creatingDemo ? '' : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-md'"
        @click="newDatabase"
      >
        <div class="w-8 h-8 rounded-full bg-green-500 relative flex-center">
          <feather-icon
            name="file-plus"
            class="text-white dark:text-gray-900 w-5 h-5"
          />
        </div>


        <div>
          <p class="font-medium dark:text-gray-50">
            {{ t`New Organization` }}
          </p>
          <p class="text-sm text-gray-700 dark:text-gray-300">
            {{
              t`Create a new organization and store all of its accounting data on your computer`
            }}
          </p>
        </div>
      </div>


      <!-- existing file -->
      <div
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2 window-no-drag cursor-pointer transition-all duration-300 ease-in-out"
        :class="creatingDemo ? '' : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-md'"
        @click="existingDatabase"
      >
        <div
          class="
            w-8
            h-8
            rounded-full
            bg-yellow-500
            dark:bg-yellow-600
            relative
            flex-center
          "
        >
          <feather-icon
            name="download"
            class="w-4 h-4 text-white dark:text-gray-900"
          />
        </div>
        <div>
          <p class="font-medium dark:text-gray-50">
            {{ t`Existing Organization` }}
          </p>
          <p class="text-sm text-gray-700 dark:text-gray-300">
            {{
              t`Load an existing organization from your computer's local storage`
            }}
          </p>
        </div>
      </div>


      <hr class="dark:border-gray-800" />


      <div class="px-4 py-2" v-if="files?.length">
        <p class="font-medium dark:text-gray-50">{{ t`Available Organizations:` }}</p>
      </div>


      <hr class="dark:border-gray-800" />




      <!-- file list -->
      <div class="overflow-y-auto" style="max-height: 290px">
        <div
          v-for="(file, i) in files"
          :key="file.dbPath"
          class="h-row-largest px-4 flex gap-4 items-center window-no-drag cursor-pointer transition-all duration-300 ease-in-out"
          :class="
            creatingDemo
              ? ''
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-sm'
          "
          :title="t`${file.companyName} stored at ${file.dbPath}`"
          @click="selectFile(file)"
        >
          <div
            class="
              w-8
              h-8
              rounded-full
              flex
              justify-center
              items-center
              text-white
              font-semibold
              flex-shrink-0
              text-base
              uppercase
            "
            :style="{ backgroundColor: getAvatarColor(file.companyName) }"
          >
            {{ capitalizeFirst(file.companyName).charAt(0) }}
          </div>
          <div class="w-full">
            <div class="flex justify-between overflow-x-auto items-baseline">
              <h2 class="font-medium dark:text-gray-50">
                {{ capitalizeFirst(file.companyName) }}
              </h2>
              <p
                class="
                  whitespace-nowrap
                  text-sm text-gray-700
                  dark:text-gray-300
                "
              >
                {{ formatDate(file.modified) }}
              </p>
            </div>
            <p
              class="
                text-sm text-gray-700
                dark:text-gray-300
                overflow-x-auto
                no-scrollbar
                whitespace-nowrap
              "
            >
              <!-- {{ truncate(file.dbPath) }} -->
            </p>
          </div>
          <button
            class="
              ms-auto
              p-2
              rounded-full
              w-8
              h-8
              text-gray-700
              dark:text-gray-300
              transition-all
              duration-300
              ease-in-out
            "
            :class="[
              'hover:bg-red-500',
              'dark:hover:bg-red-600',
              'dark:hover:bg-opacity-40',
              'hover:text-white',
              'dark:hover:text-white'
            ]"
            @click.stop="() => deleteDb(i)"
          >
            <feather-icon name="x" class="w-4 h-4" />
          </button>
        </div>
      </div>
      <hr v-if="files?.length" class="dark:border-gray-800" />
     
     
    </div>
  </div>
</template>


<script lang="ts">
import { t } from 'fyo';
import { Verb } from 'fyo/telemetry/types';
import { DateTime } from 'luxon';
import Button from 'src/components/Button.vue';
import FeatherIcon from 'src/components/FeatherIcon.vue';
import Loading from 'src/components/Loading.vue';
import Modal from 'src/components/Modal.vue';
import { fyo } from 'src/initFyo';
import { showDialog } from 'src/utils/interactive';
import { updateConfigFiles } from 'src/utils/misc';
import { deleteDb, getSavePath, getSelectedFilePath } from 'src/utils/ui';
import type { ConfigFilesWithModified } from 'utils/types';
import { defineComponent } from 'vue';


export default defineComponent({
  name: 'DatabaseSelector',
  components: {
    Loading,
    FeatherIcon,
    Modal,
    Button,
  },
  emits: ['file-selected', 'new-database'],
  data() {
    return {
      loadingDatabase: false,
      files: [],
      creatingDemo: false,
    } as {
      loadingDatabase: boolean;
      files: ConfigFilesWithModified[];
      creatingDemo: boolean;
    };
  },
  async mounted() {
    await this.setFiles();


    if (fyo.store.isDevelopment) {
      // @ts-ignore
      window.ds = this;
    }
  },
  methods: {
    getGreeting() {
      const hour = new Date().getHours();
      if (hour < 12) {
        return this.t`Good Morning`;
      } else if (hour < 17) {
        return this.t`Good Afternoon`;
      } else {
        return this.t`Good Evening`;
      }
    },
    truncate(value: string) {
      if (value.length < 72) {
        return value;
      }
      return '...' + value.slice(value.length - 72);
    },
    formatDate(isoDate: string) {
      return DateTime.fromISO(isoDate).toRelative();
    },
    capitalizeFirst(value: string) {
      if (!value) return '';
      return value.charAt(0).toUpperCase() + value.slice(1);
    },
    getAvatarColor(companyName: string) {
      const colors = [
        '#E03636', '#E86C13', '#EDBA13', '#59BA8B', '#36BAAD', '#33A1FF',
        '#667eea', '#9C45E3', '#CF3A96', '#6846E3', '#34BAE3', '#E79913'
      ];
      if (!companyName) {
        return colors[0];
      }
      let hash = 0;
      for (let i = 0; i < companyName.length; i++) {
        hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
      }
      const index = Math.abs(hash) % colors.length;
      return colors[index];
    },
    async deleteDb(i: number) {
      const file = this.files[i];
      const setFiles = this.setFiles.bind(this);


      await showDialog({
        title: t`Delete ${file.companyName}?`,
        detail: t`Database file: ${file.dbPath}`,
        type: 'warning',
        buttons: [
          {
            label: this.t`Yes`,
            async action() {
              await deleteDb(file.dbPath);
              await setFiles();
            },
            isPrimary: true,
          },
          {
            label: this.t`No`,
            action() {
              return null;
            },
            isEscape: true,
          },
        ],
      });
    },
    async setFiles() {
      const dbList = await ipc.getDbList();
      this.files = dbList?.sort(
        (a, b) => Date.parse(b.modified) - Date.parse(a.modified)
      );
    },
    newDatabase() {
      this.$emit('new-database');
    },
    async existingDatabase() {
      const filePath = (await getSelectedFilePath())?.filePaths?.[0];
      this.emitFileSelected(filePath);
    },
    selectFile(file: ConfigFilesWithModified) {
      this.emitFileSelected(file.dbPath);
    },
    emitFileSelected(filePath: string) {
      if (!filePath) {
        return;
      }
      this.$emit('file-selected', filePath);
    },
  },
});
</script>


<style>
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}


.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out forwards;
}


.w-form {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}


.h-row-largest {
  height: 80px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}


.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}


.w-form:hover {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}


.overflow-y-auto {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>

