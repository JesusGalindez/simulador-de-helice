# Simulador de Eficiencia de Hélice Toroidal 3D ✈️∞

Un simulador interactivo en 3D de última generación diseñado en HTML5, CSS moderno (con diseño glassmorphism) y **Three.js** para comparar el rendimiento aerodinámico, hidrodinámico y acústico de las revolucionarias **hélices toroidales** (estilo Sharrow/MIT) frente a las hélices tradicionales de dos palas.

---

## 🌪️ Características Principales

*   **Renderizado procedural en 3D**: Generación matemática dinámica de la geometría toroidal de cinta continua (figura de 8) y de hélices tradicionales.
*   **Simulación de fluidos con partículas**: 4,000 partículas interactivas aceleradas en tiempo real. Muestra el flujo laminar limpio de la toroidal frente a los vórtices turbulentos naranjas en las puntas de pala de la convencional.
*   **Física en tiempo real**: Cálculos precisos de Empuje ($T$), Torque ($Q$), Potencia mecánica ($P$), Eficiencia propulsiva ($\eta$) y Número de Reynolds ($Re$) en función de la velocidad de avance ($J$) y densidad del fluido.
*   **Modo multio-medio**: Alterna entre **Aire** (aerodinámica de drones/ventiladores) y **Agua** (hidrodinámica de propulsión marina) con escala física ajustada de inmediato.
*   **Análisis Acústico & Telemetría**:
    *   Medidor dinámico de decibelios (dBA) mostrando la atenuación de ruido de la hélice toroidal (-12dB a -18dB).
    *   Osciloscopio acústico animado (onda armónica toroidal vs. ruido caótico estándar).
    *   Gráfica de curvas de eficiencia interactiva (2D Canvas) mostrando el punto de operación dinámico.

---

## 🚀 Cómo ejecutar localmente

1.  Clona este repositorio o entra al directorio.
2.  Instala el servidor de desarrollo ligero:
    ```bash
    npm install
    ```
3.  Inicia el servidor local:
    ```bash
    npm run dev
    ```
4.  Abre el navegador en `http://localhost:3000`.

---

## ☁️ Despliegue en la Nube

Este repositorio está pre-configurado para desplegarse instantáneamente en **Vercel** o **Firebase Hosting** gracias al archivo `vercel.json` incluido, el cual habilita compresión y caché de red de alta velocidad para recursos estáticos en 3D.
