%% Implementación de Métodos Numéricos para Análisis Térmico de GPU
% Script de procesamiento - Informe Final
clear; clc; close all;

%% ==========================================
% BLOQUE 1 Y 2: Carga y Ordenamiento
% ==========================================
datos = readtable('datos_gpu.xlsx');
T_crudo = datos.Temperatura;
P_crudo = datos.Potencia;

% Ordenamiento respecto a la potencia para aplicar derivadas numéricas
[P, idx] = sort(P_crudo);
T = T_crudo(idx);

disp('Datos cargados y ordenados exitosamente.');

%% ==========================================
% BLOQUE 3: Regresión por mínimos cuadrados
% ==========================================
p = polyfit(P, T, 3);
Tfit = polyval(p, P);

fprintf('\n=== COEFICIENTES DEL POLINOMIO (Grado 3) ===\n');
fprintf('a3 = %g\n', p(1));
fprintf('a2 = %g\n', p(2));
fprintf('a1 = %g\n', p(3));
fprintf('a0 = %g\n', p(4));

%% ==========================================
% BLOQUE 4: Validación y Análisis de Residuos
% ==========================================
res = T - Tfit;
RMSE = sqrt(mean(res.^2));
MAE = mean(abs(res));
Error_Max = max(abs(res));

fprintf('\n=== ANÁLISIS DE RESIDUOS ===\n');
fprintf('RMSE = %.4f °C\n', RMSE);
fprintf('MAE = %.4f °C\n', MAE);
fprintf('Error Max = %.4f °C\n', Error_Max);

%% ==========================================
% BLOQUE 5: Sensibilidad Térmica (dT/dP)
% ==========================================
dT = diff(T);
dP = diff(P);
valid = abs(dP) > 0.01; % Filtro anti-singularidad numérica
dTdP = dT(valid) ./ dP(valid);

% Vector X para la gráfica (mismo tamaño que dTdP filtrado)
P_valid = P(1:end-1);
P_valid = P_valid(valid);

fprintf('\n=== SENSIBILIDAD TÉRMICA (dT/dP) ===\n');
fprintf('Promedio = %.4f °C/W\n', mean(dTdP));
fprintf('Max dT/dP (Artefacto numérico) = %.4f °C/W\n', max(dTdP));
fprintf('Min dT/dP (Artefacto numérico) = %.4f °C/W\n', min(dTdP));

%% ==========================================
% BLOQUE 6: Dinámica Temporal (Inercia Térmica)
% ==========================================
dt = 2; % Intervalo de muestreo constante en segundos (fijado manualmente)
dTdt = diff(T_crudo) / dt; 

fprintf('\n=== DINÁMICA TEMPORAL (dT/dt) ===\n');
fprintf('Max velocidad de calentamiento = %.4f °C/s\n', max(dTdt));

%% ==========================================
% BLOQUE 7: Criterio Estadístico de Régimen
% ==========================================
variacion_sensibilidad = abs(diff(dTdP));
mu = mean(variacion_sensibilidad);
sigma = std(variacion_sensibilidad);
umbral = mu + 2*sigma;

fprintf('\n=== CRITERIO DE RÉGIMEN ===\n');
fprintf('Mu (Media) = %.4f\n', mu);
fprintf('Sigma (Desviación) = %.4f\n', sigma);
fprintf('Umbral (Mu + 2*Sigma) = %.4f\n\n', umbral);


%% ==========================================
% GENERACIÓN DE GRÁFICAS (Formato Profesional IEEE)
% ==========================================

% 0. Perfil de Carga y Respuesta Térmica (Ejes separados)
dt = 2; % Definimos el paso de tiempo aquí para evitar errores
tiempo_real = 0 : dt : (length(T_crudo)-1)*dt;

figure('Name','Datos Experimentales Crudos');
yyaxis left; % Eje izquierdo para la Temperatura
plot(tiempo_real, T_crudo, '-', 'LineWidth', 2, 'Color', '#0072BD');
ylabel('Temperatura (°C)', 'Color', '#0072BD');
set(gca, 'YColor', '#0072BD');
ylim([30 80]); % Ajusta según tus datos

yyaxis right; % Eje derecho para la Potencia
plot(tiempo_real, P_crudo, '-', 'LineWidth', 2, 'Color', '#D95319');
ylabel('Potencia (W)', 'Color', '#D95319');
set(gca, 'YColor', '#D95319');
ylim([0 160]); % Ajusta según tus datos

grid on; xlabel('Tiempo (s)');
title('Perfil de Carga Escalonada y Respuesta Térmica');

% 1. Regresión P vs T
figure('Name','Regresión Polinómica');
scatter(P, T, 15, 'filled', 'MarkerFaceAlpha', 0.6); hold on;
plot(P, Tfit, 'r', 'LineWidth', 2);
grid on; xlabel('Potencia (W)'); ylabel('Temperatura (°C)');
title('Ajuste Polinómico (Grado 3)');
legend('Datos Experimentales', 'Modelo Matemático', 'Location', 'northwest');

% 2. Residuos del Modelo
figure('Name','Análisis de Residuos');
plot(res, 'b', 'LineWidth', 1.2);
grid on; xlabel('Muestra Ordenada'); ylabel('Error Absoluto (°C)');
title('Residuos del Modelo (T_{exp} - T_{fit})');

% 3. Sensibilidad Térmica
figure('Name','Sensibilidad Térmica (dT/dP)');
plot(P_valid, dTdP, 'LineWidth', 1.5, 'Color', '#0072BD');
grid on; xlabel('Potencia (W)'); ylabel('Sensibilidad (dT/dP) [°C/W]');
title('Sensibilidad Térmica vs Potencia');

% 4. Inercia Térmica (dT/dt)
% Truco numérico: Crear el vector de tiempo automáticamente para graficar
tiempo_simulado = 0 : dt : (length(T_crudo)-1)*dt;
figure('Name','Inercia Térmica (dT/dt)');
plot(tiempo_simulado(1:end-1), dTdt, 'LineWidth', 1.5, 'Color', '#D95319');
grid on; xlabel('Tiempo (s)'); ylabel('Velocidad (dT/dt) [°C/s]');
title('Dinámica Temporal: Inercia Térmica');