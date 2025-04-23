<template>
  <div
    ref="container"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      margin: 'auto',
      position: 'relative',
    }"
  >
    <canvas ref="canvasArea" :width="size" :height="size"></canvas>
    <div
      v-for="({ x, y }, i) of scoreShowPoints"
      :key="i"
      :style="{
        left: x + 'px',
        top: y + 'px',
        position: 'absolute',
      }"
    >
      <a-tooltip>
        <template #title>{{ props.hints[i] }} </template>
        {{ scores[i].toFixed(1) }}
      </a-tooltip>
    </div>
  </div>
</template>
<style scoped>
.label22 {
  position: relative;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
}
</style>
<script setup>
const emit = defineEmits(["score"]);

const props = defineProps({
  scores: { type: Array },
  hints: { type: Array },
  radius: { type: Number, default: 200 },
  rate: { type: Number, default: 0.7 },
  fullScore: { type: Number, default: 100 },
  baseScore: { type: Number, default: 0 },
  dotSize: { type: Number, default: 4 }, // 分数标注小圆点的尺寸
  showTotalScore: { type: Boolean, default: true },
  circleColor: { type: String, default: "rgba(0, 0, 0, 0)" },
  dashColor: { type: String, default: "#666" },
  outerColor: { type: String, default: "#666" },
  innerColor: { type: String, default: "rgba(230, 126, 34, 1)" },
  fillColor: { type: String, default: "rgba(255, 208, 22, 0.384)" },
});
const size = props.radius * 2;
const container = ref(null);
const canvasArea = ref(null);

const shrinkRadius = computed(() => props.radius * props.rate);
const dataRate = computed(() => shrinkRadius.value / (props.fullScore - props.baseScore));
const rawDataRate = computed(() => shrinkRadius.value / props.fullScore);
const realScores = computed(() => props.scores.map((n) => n - props.baseScore));
const rawScores = computed(() => props.scores.map((n) => n * rawDataRate.value));
const ratedScores = computed(() => realScores.value.map((n) => n * dataRate.value));

const getArea = (points) => {
  let t = 0;
  const n = points.length;
  for (const [i, { x, y }] of points.entries()) {
    const p = points[i + 1 === n ? 0 : i + 1];
    t = t + x * p.y - p.x * y;
  }
  return Math.abs(t * 0.5);
};
const getTopPoints = (n, rate = 1) => {
  const points = [];
  for (let i = 0; i < n; i++) {
    const angle = (i * Math.PI * 2) / n - Math.PI / 2;
    const offsetX = shrinkRadius.value * Math.cos(angle) * rate;
    const offsetY = shrinkRadius.value * Math.sin(angle) * rate;
    const x = props.radius + offsetX;
    const y = props.radius + offsetY;
    points.push({ x, y });
  }
  return points;
};
const getPoints = (scores) => {
  const n = scores.length;
  const points = [];
  for (let i = 0; i < n; i++) {
    const angle = (i * Math.PI * 2) / n - Math.PI / 2;
    const offsetX = scores[i] * Math.cos(angle);
    const offsetY = scores[i] * Math.sin(angle);
    const x = props.radius + offsetX;
    const y = props.radius + offsetY;
    points.push({ x, y });
  }
  return points;
};
const beautifyPosition = ({ x, y }) => {
  if (x == props.radius) {
    x = x - 7;
  } else if (x < props.radius) {
    x = x - 15;
  } else if (x > props.radius) {
    x = x - 17;
  }
  y = y - 10;

  return { x, y };
};
// 正N边形的顶点坐标
const topPoints = computed(() => getTopPoints(ratedScores.value.length));
const rawTopPoints = computed(() => getTopPoints(rawScores.value.length));
// 分数在等分线上的标记坐标
const points = computed(() => getPoints(ratedScores.value));
const rawPoints = computed(() => getPoints(rawScores.value));
// 显示分数的坐标，应在topPoints外侧
const scoreShowPoints = computed(() =>
  getTopPoints(ratedScores.value.length, 1.2).map(beautifyPosition),
);
const n = ratedScores.value.length;
const areaScore = computed(() =>
  Math.sqrt((getArea(rawPoints.value) / getArea(rawTopPoints.value)) * 10000).toFixed(2),
);
const avgScore = computed(() => (ratedScores.value.reduce((x, y) => x + y) / n).toFixed(2));

const reDraw = () => {
  const canvas = canvasArea.value;
  const context = canvas.getContext("2d");
  // 清除画布
  context.clearRect(0, 0, canvas.width, canvas.height);
  // 画圆
  const drawCircle = () => {
    context.beginPath();
    context.arc(props.radius, props.radius, shrinkRadius.value, 0, 2 * Math.PI);
    context.strokeStyle = props.circleColor;
    context.closePath();
    context.stroke();
  };
  const drawMeanLines = (points) => {
    //画等分线
    for (const { x, y } of points) {
      context.beginPath();
      context.moveTo(props.radius, props.radius);
      context.lineTo(x, y);
      context.setLineDash([0.5, 3]);
      context.strokeStyle = props.dashColor;
      context.closePath();
      context.stroke();
    }
    context.setLineDash([]);
  };
  const connectOuterPoints = (points) => {
    //连接N个顶点
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    const n = points.length;
    for (let i = 1; i <= n; i++) {
      const pointIndex = i % n;
      context.lineTo(points[pointIndex].x, points[pointIndex].y);
      context.lineWidth = 2;
      context.strokeStyle = props.outerColor;
      context.stroke();
    }
    context.closePath();
  };
  const connectInnerPoints = (points) => {
    //连接N个顶点
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    const n = points.length;
    for (let i = 1; i <= n; i++) {
      const pointIndex = i % n;
      context.lineTo(points[pointIndex].x, points[pointIndex].y);
      context.lineWidth = 2;
      context.strokeStyle = props.innerColor;
      context.stroke();
    }
    context.closePath();
    // context.fillStyle = props.fillColor;
    // context.fill();
  };
  const fillPoints = (points, color) => {
    // 填充
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    const n = points.length;
    for (let i = 1; i <= n; i++) {
      const pointIndex = i % n;
      context.lineTo(points[pointIndex].x, points[pointIndex].y);
    }
    context.closePath();
    context.fillStyle = color;
    context.fill();
  };
  const drawScoreDots = (points) => {
    //标记分数点
    for (const { x, y } of points) {
      context.beginPath();
      context.arc(x, y, props.dotSize, 0, 2 * Math.PI);
      context.closePath();
      context.fillStyle = props.innerColor;
      context.fill();
    }
  };

  const drawTotalScore = (score) => {
    context.font = "bold 120% serif";
    context.fillStyle = props.outerColor;
    context.fillText(score, props.radius - 20, props.radius + 3);
    context.font = "bold 100% serif";
  };

  drawMeanLines(topPoints.value);
  connectOuterPoints(topPoints.value);
  connectInnerPoints(points.value);
  drawScoreDots(points.value);
  fillPoints(points.value, props.fillColor);
  // drawScoreDots(scoreShowPoints.value);
  // drawCircle(context);

  // 圆心处标注面积分数
  if (props.showTotalScore) {
    drawTotalScore(areaScore.value);
  }
  emit("score", {
    area: areaScore.value,
    avg: avgScore.value,
  });
};
watch(props, reDraw, { deep: true });
onMounted(() => {
  reDraw();
});
</script>
