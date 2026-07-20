// Datos de ejemplo simulados basados en el muestreo de la GPU
const P_crudo = [10, 25, 40, 60, 80, 100, 120, 140, 150]; // Potencia (W)
const T_crudo = [35, 42, 48, 55, 63, 70, 75, 78, 80];    // Temperatura (°C)
const dt = 2; // Intervalo de muestreo (s)

// Algoritmo de Regresión Polinómica Cúbica por Mínimos Cuadrados
function cubicRegression(x, y) {
  let n = x.length;
  let sX = 0, sX2 = 0, sX3 = 0, sX4 = 0, sX5 = 0, sX6 = 0;
  let sY = 0, sXY = 0, sX2Y = 0, sX3Y = 0;

  for (let i = 0; i < n; i++) {
    let xi = x[i], yi = y[i];
    let xi2 = xi * xi, xi3 = xi2 * xi;
    sX += xi; sX2 += xi2; sX3 += xi3;
    sX4 += xi3 * xi; sX5 += xi3 * xi2; sX6 += xi3 * xi3;
    sY += yi; sXY += xi * yi; sX2Y += xi2 * yi; sX3Y += xi3 * yi;
  }

  // Sistema de Ecuaciones Normales M * [a0, a1, a2, a3]^T = B
  // Resolver matriz mediante Eliminación Gaussiana simple
  let M = [
    [n, sX, sX2, sX3, sY],
    [sX, sX2, sX3, sX4, sXY],
    [sX2, sX3, sX4, sX5, sX2Y],
    [sX3, sX4, sX5, sX6, sX3Y]
  ];

  for (let i = 0; i < 4; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 4; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    for (let k = i + 1; k < 4; k++) {
      let c = -M[k][i] / M[i][i];
      for (let j = i; j < 5; j++) {
        if (i === j) M[k][j] = 0;
        else M[k][j] += c * M[i][j];
      }
    }
  }

  let coef = [0, 0, 0, 0];
  for (let i = 3; i >= 0; i--) {
    coef[i] = M[i][4] / M[i][i];
    for (let k = i - 1; k >= 0; k--) {
      M[k][4] -= M[k][i] * coef[i];
    }
  }
  return { a0: coef[0], a1: coef[1], a2: coef[2], a3: coef[3] };
}

// Inicializar cálculos
const coefs = cubicRegression(P_crudo, T_crudo);

// T_fit y Residuos
const T_fit = P_crudo.map(p => coefs.a3 * Math.pow(p, 3) + coefs.a2 * Math.pow(p, 2) + coefs.a1 * p + coefs.a0);
const res = T_crudo.map((t, i) => t - T_fit[i]);

// Cálculo de Métricas
const rmse = Math.sqrt(res.reduce((acc, r) => acc + r * r, 0) / res.length);
const mae = res.reduce((acc, r) => acc + Math.abs(r), 0) / res.length;
const errMax = Math.max(...res.map(r => Math.abs(r)));

// Derivada dT/dt
const dTdt = [];
const tiempo = [];
for (let i = 0; i < T_crudo.length - 1; i++) {
  dTdt.push((T_crudo[i + 1] - T_crudo[i]) / dt);
  tiempo.push(i * dt);
}
const maxdTdt = Math.max(...dTdt);

// Mostrar resultados en la interfaz
document.getElementById('coef-a3').textContent = coefs.a3.toExponential(4);
document.getElementById('coef-a2').textContent = coefs.a2.toFixed(4);
document.getElementById('coef-a1').textContent = coefs.a1.toFixed(4);
document.getElementById('coef-a0').textContent = coefs.a0.toFixed(4);

document.getElementById('val-rmse').textContent = rmse.toFixed(4);
document.getElementById('val-mae').textContent = mae.toFixed(4);
document.getElementById('val-errmax').textContent = errMax.toFixed(4);
document.getElementById('val-dtdt').textContent = maxdTdt.toFixed(4);
document.getElementById('val-sensib').textContent = (coefs.a1).toFixed(4);

// Configuración de Gráficas en Plotly
const themeLayout = {
  paper_bgcolor: '#1e293b',
  plot_bgcolor: '#1e293b',
  font: { color: '#f8fafc' },
  xaxis: { gridcolor: '#334155' },
  yaxis: { gridcolor: '#334155' }
};

// 1. Gráfica de Regresión
Plotly.newPlot('plot-regresion', [
  { x: P_crudo, y: T_crudo, mode: 'markers', name: 'Datos Exp.', marker: { color: '#60a5fa', size: 8 } },
  { x: P_crudo, y: T_fit, mode: 'lines', name: 'Regresión Cúbica', line: { color: '#ef4444', width: 2 } }
], { ...themeLayout, title: 'Ajuste Polinómico Cúbico (Potencia vs Temperatura)' });

// 2. Gráfica de Residuos
Plotly.newPlot('plot-residuos', [
  { x: P_crudo.map((_, i) => i + 1), y: res, mode: 'lines+markers', line: { color: '#38bdf8' } }
], { ...themeLayout, title: 'Residuos del Modelo (T_exp - T_fit)', xaxis: { title: 'Muestra' }, yaxis: { title: 'Error (°C)' } });

// 3. Gráfica de Inercia Térmica (dT/dt)
Plotly.newPlot('plot-inercia', [
  { x: tiempo, y: dTdt, mode: 'lines', line: { color: '#f97316', width: 2 } }
], { ...themeLayout, title: 'Inercia Térmica (dT/dt)', xaxis: { title: 'Tiempo (s)' }, yaxis: { title: 'dT/dt (°C/s)' } });

// Pestañas
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
  window.dispatchEvent(new Event('resize'));
}