<script>
export let data;

import { Pie } from 'svelte-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale)

let options = {
    responsive: false,
    maintainAspectRatio: true
}


</script>

<Pie {data} {options} class='bar' />
<!--

<Pie {data} options={{ responsive: true }} />
-->
<style>
    :global(canvas.bar) {
        width: 200px;
        height: 200px;
        margin: 0 auto;
    }
</style>