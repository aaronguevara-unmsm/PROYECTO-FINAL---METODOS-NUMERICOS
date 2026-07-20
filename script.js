// Datos por defecto (si no se sube un archivo)
let P_crudo = [10, 25, 40, 60, 80, 100, 120, 140, 150];
let T_crudo = [35, 42, 48, 55, 63, 70, 75, 78, 80];
const dt = 2;

// Función para procesar la subida del Excel
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('file-name').textContent = `📄 ${file.name}`;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    let newP = [];
    let newT = [];

    // Omitir cabecera si existe y extraer valores
    for (let i = 0; i < jsonData.length; i++) {
      let row = jsonData[i];
      if (row.length >= 2 && !isNaN(row[0]) && !isNaN(row[1])) {
        newP.push(Number(row[0]));
        newT.push(Number(row[1]));
      }
    }

    if (newP.length > 3) {
      P_crudo = newP;
      T_crudo = newT;
      calcularYGraficar();
    } else {
      alert("El archivo Excel debe contener al menos 4 filas numéricas con [Potencia, Temperatura].");
    }
  };
  reader.readAsArrayBuffer(file);
}

// Algoritmo de Regresión Cúbica
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

function calcularYGraficar() {
  const coefs = cubicRegression(P_crudo, T_crudo);
  const T_fit = P_crudo.map(p => coefs.a3 * Math.pow(p, 3) + coefs.a2 * Math.pow(p, 2) + coefs.a1 * p + coefs.a0);
  const res = T_crudo.map((t, i) => t - T_fit[i]);

  const rmse = Math.sqrt(res.reduce((acc, r) => acc + r * r, 0) / res.length);
  const mae = res.reduce((acc, r) => acc + Math.abs(r), 0) / res.length;
  const errMax = Math.max(...res.map(r => Math.abs(r)));

  const dTdt = [];
  const tiempo = [];
  for (let i = 0; i < T_crudo.length - 1; i++) {
    dTdt.push((T_crudo[i + 1] - T_crudo[i]) / dt);
    tiempo.push(i * dt);
  }
  const maxdTdt = Math.max(...dTdt);

  document.getElementById('coef-a3').textContent = coefs.a3.toExponential(4);
  document.getElementById('coef-a2').textContent = coefs.a2.toFixed(4);
  document.getElementById('coef-a1').textContent = coefs.a1.toFixed(4);
  document.getElementById('coef-a0').textContent = coefs.a0.toFixed(4);

  document.getElementById('val-rmse').textContent = rmse.toFixed(4);
  document.getElementById('val-mae').textContent = mae.toFixed(4);
  document.getElementById('val-errmax').textContent = errMax.toFixed(4);
  document.getElementById('val-dtdt').textContent = maxdTdt.toFixed(4);
  document.getElementById('val-sensib').textContent = coefs.a1.toFixed(4);

  const themeLayout = {
    paper_bgcolor: '#1e293b',
    plot_bgcolor: '#1e293b',
    font: { color: '#f8fafc' },
    xaxis: { gridcolor: '#334155' },
    yaxis: { gridcolor: '#334155' }
  };
// Configuración para idioma español y responsividad
  const configPlotly = {
    locale: 'es',
    responsive: true
  };
  Plotly.newPlot('plot-regresion', [
    { x: P_crudo, y: T_crudo, mode: 'markers', name: 'Datos Exp.', marker: { color: '#60a5fa', size: 8 } },
    { x: P_crudo, y: T_fit, mode: 'lines', name: 'Regresión Cúbica', line: { color: '#ef4444', width: 2 } }
  ], { ...themeLayout, title: 'Ajuste Polinómico Cúbico (Potencia vs Temperatura)' }, configPlotly);

  Plotly.newPlot('plot-residuos', [
    { x: P_crudo.map((_, i) => i + 1), y: res, mode: 'lines+markers', line: { color: '#38bdf8' } }
  ], { ...themeLayout, title: 'Residuos del Modelo (T_exp - T_fit)', xaxis: { title: 'Muestra' }, yaxis: { title: 'Error (°C)' } }, configPlotly);

  Plotly.newPlot('plot-inercia', [
    { x: tiempo, y: dTdt, mode: 'lines', line: { color: '#f97316', width: 2 } }
  ], { ...themeLayout, title: 'Inercia Térmica (dT/dt)', xaxis: { title: 'Tiempo (s)' }, yaxis: { title: 'dT/dt (°C/s)' } }, configPlotly);
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
  window.dispatchEvent(new Event('resize'));
}

// Ejecutar al cargar la página
calcularYGraficar();
