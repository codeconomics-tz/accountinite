<script lang="ts">
import { uicolors } from 'src/utils/colors';

export default {
  name: 'IconBase',
  props: {
    active: Boolean,
    darkMode: { type: Boolean, default: false },
  },
  computed: {
    lightColor(): string {
      const activeGray = this.darkMode
        ? uicolors.gray['400']
        : uicolors.gray['600'];
      const passiveGray = this.darkMode
        ? uicolors.gray['600']
        : uicolors.gray['400'];
      return this.active ? activeGray : passiveGray;
    },
    darkColor(): string {
      const activeGreen = this.darkMode
        ? uicolors.green['400']
        : uicolors.green['700'];
      const passiveGray = this.darkMode
        ? uicolors.gray['300']
        : uicolors.gray['700'];
      return this.active ? activeGreen : passiveGray;
    },
    bgColor(): string {
      return this.darkMode ? uicolors.gray['850'] : uicolors.gray['100'];
    },
  },
};
</script>