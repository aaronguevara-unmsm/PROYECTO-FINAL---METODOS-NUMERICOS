// Datos por defecto (si no se sube un archivo)
let P_crudo = [10, 25, 40, 60, 80, 100, 120, 140, 150];
let T_crudo = [35, 42, 48, 55, 63, 70, 75, 78, 80];
const dt = 2;

// Función para procesar la subida del Excel (HWiNFO)
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const fileNameElement = document.getElementById('file-name');
  if (fileNameElement) {
    fileNameElement.textContent = `📄 ${file.name}`;
  }

  const reader = new FileReader();

  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convertir la hoja a matriz de filas
      const jsonSheet = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!jsonSheet || jsonSheet.length < 2) {
        alert("El archivo parece estar vacío o no contiene suficientes filas.");
        return;
      }

      // POSICIONES EXACTAS PARA HWiNFO:
      // Columna NV (386 en Excel) -> Índice 385 en JavaScript (Temperatura)
      // Columna OC (393 en Excel) -> Índice 392 en JavaScript (Potencia)
      const COL_TEMP_NV = 385;
      const COL_POWER_OC = 392;

      let newP = [];
      let newT = [];

      // Función para limpiar texto, comas decimales y extraer solo el número
      const parseCleanNumber = (val) => {
        if (val === null || val === undefined) return NaN;
        if (typeof val === 'number') return val;
        
        const cleanStr = String(val)
          .replace(/,/g, '.')
          .replace(/[^\d.-]/g, '');
          
        return parseFloat(cleanStr);
      };

      // Recorrer las filas del Excel
      for (let i = 0; i < jsonSheet.length; i++) {
        const row = jsonSheet[i];
        if (!row || row.length === 0) continue;

        let valTemp = parseCleanNumber(row[COL_TEMP_NV]);
        let valPower = parseCleanNumber(row[COL_POWER_OC]);

        // Guardar solo si ambos son números válidos
        if (!isNaN(valTemp) && !isNaN(valPower)) {
          newT.push(valTemp);
          newP.push(valPower);
        }
      }

      if (newP.length > 3) {
        P_crudo = newP;
        T_crudo = newT;
        calcularYGraficar(); // Actualizar las 4 gráficas en vivo
      } else {
        alert(`No se pudieron extraer datos numéricos de las columnas NV (385) y OC (392). Filas procesadas: ${newP.length}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el archivo Excel.");
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
    sX += xi;
    sX2 += xi2;
    sX3 += xi3;
    sX4 += xi3 * xi;
    sX5 += xi3 * xi2;
    sX6 += xi3 * xi3;
    sY += yi;
    sXY += xi * yi;
    sX2Y += xi2 * yi;
    sX3Y += xi3 * yi;
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

  // Muestra de coeficientes a 2 decimales (o exponencial a 2 decimales para a3)
  document.getElementById('coef-a3').textContent = coefs.a3.toExponential(2);
  document.getElementById('coef-a2').textContent = coefs.a2.toFixed(2);
  document.getElementById('coef-a1').textContent = coefs.a1.toFixed(2);
  document.getElementById('coef-a0').textContent = coefs.a0.toFixed(2);

  // Métricas recortadas a 2 decimales
  document.getElementById('val-rmse').textContent = rmse.toFixed(2);
  document.getElementById('val-mae').textContent = mae.toFixed(2);
  document.getElementById('val-errmax').textContent = errMax.toFixed(2);
  document.getElementById('val-dtdt').textContent = maxdTdt.toFixed(2);
  document.getElementById('val-sensib').textContent = coefs.a1.toFixed(2);

  const themeLayout = {
    paper_bgcolor: '#121215',
    plot_bgcolor: '#121215',
    font: { color: '#f4f4f5', family: 'Poppins' },
    xaxis: { gridcolor: '#27272a', zerolinecolor: '#3f3f46', tickformat: '.2f' },
    yaxis: { gridcolor: '#27272a', zerolinecolor: '#3f3f46', tickformat: '.2f' }
  };

  const configPlotly = { locale: 'es', responsive: true };

  // 1. Gráfica de Regresión Cúbica
  Plotly.newPlot('plot-regresion', [
    { x: P_crudo, y: T_crudo, mode: 'markers', name: 'Datos Exp.', marker: { color: '#60a5fa', size: 8 } },
    { x: P_crudo, y: T_fit, mode: 'lines', name: 'Regresión Cúbica', line: { color: '#ef4444', width: 2 } }
  ], { ...themeLayout, title: 'Ajuste Polinómico Cúbico (Potencia vs Temperatura)' }, configPlotly);

  // 2. Gráfica de Residuos
  Plotly.newPlot('plot-residuos', [
    { x: P_crudo.map((_, i) => i + 1), y: res, mode: 'lines+markers', line: { color: '#38bdf8' } }
  ], { ...themeLayout, title: 'Residuos del Modelo (T_exp - T_fit)', xaxis: { title: 'Muestra' }, yaxis: { title: 'Error (°C)' } }, configPlotly);

  // 3. Gráfica de Inercia Térmica
  Plotly.newPlot('plot-inercia', [
    { x: tiempo, y: dTdt, mode: 'lines', line: { color: '#f97316', width: 2 } }
  ], { ...themeLayout, title: 'Inercia Térmica (dT/dt)', xaxis: { title: 'Tiempo (s)' }, yaxis: { title: 'dT/dt (°C/s)' } }, configPlotly);

  // 4. Gráfica de Sensibilidad Térmica (dT/dP) - Ordenada para curva suave
  const P_ordenado = [...P_crudo].sort((a, b) => a - b);
  const dTdP = P_ordenado.map(p => 3 * coefs.a3 * Math.pow(p, 2) + 2 * coefs.a2 * p + coefs.a1);

  Plotly.newPlot('plot-sensibilidad', [
    { x: P_ordenado, y: dTdP, mode: 'lines', line: { color: '#eab308', width: 2 } }
  ], { ...themeLayout, title: 'Sensibilidad Térmica (dT/dP vs Potencia)', xaxis: { title: 'Potencia (W)' }, yaxis: { title: 'dT/dP (°C/W)' } }, configPlotly);
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) selectedTab.classList.add('active');
  if (event && event.target) event.target.classList.add('active');
  
  window.dispatchEvent(new Event('resize'));
}

// Ejecutar al cargar la página
calcularYGraficar();
