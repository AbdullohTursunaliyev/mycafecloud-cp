<template>
  <div class="chart-shell">
    <Chart :type="type" :data="data" :options="options" />
  </div>
</template>

<script setup lang="ts">
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Chart } from 'vue-chartjs'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
)

defineProps<{
  type: 'line' | 'bar' | 'doughnut'
  data: any
  options?: any
}>()
</script>

<style scoped>
.chart-shell {
  min-height: 260px;
}
</style>
