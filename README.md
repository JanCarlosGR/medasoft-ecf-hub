# Medasoft e-CF Hub 🇩🇴

[![DGII Compliance](https://img.shields.io/badge/DGII-Ley%2032--23%20Cumplido-0284c7.svg)](https://dgii.gov.do)
[![Status](https://img.shields.io/badge/Status-Producci%C3%B3n%20Aprobada-emerald.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

Plataforma full-stack para la gestión, emisión, validación y certificación de **Comprobantes Fiscales Electrónicos (e-CF)** bajo las especificaciones técnicas de la Dirección General de Impuestos Internos (DGII) de la República Dominicana.

Este proyecto fue diseñado, desarrollado, probado y auditado por el equipo de **5 Agentes Autónomos de Inteligencia Artificial de Medasoft**:

```
                               ┌──────────────────────────────────────────────┐
                               │     SOFIA (Product Analyst & Specs Lead)     │
                               │           docs/REQUIREMENTS.md               │
                               └──────────────────────┬───────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │ MARCUS (Backend Architect)│                                 │ ELENA (Frontend Architect)│
         │ backend/ (Express/TS/API) │                                 │ frontend/ (Dashboard UI)  │
         └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                       │                                                             │
                       └──────────────────────────────┬──────────────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │ VECTOR (QA Automation)    │                                 │ ECHO (QA Deep Auditor)    │
         │ tests/api-integration.mjs │                                 │ docs/QA_AUDIT_REPORT.md   │
         └───────────────────────────┘                                 └───────────────────────────┘
```

---

## 👥 Equipo de Agentes y Responsabilidades

| Agente | Rol | Modelo AI | Contribución en el Repositorio |
| :--- | :--- | :--- | :--- |
| **Sofia** | Product Analyst & Requerimientos | Claude 3.7 Sonnet (Thinking) | `docs/REQUIREMENTS.md`: Levantamiento funcional completo, catálogo de e-NCF (E31, E32, E34, etc.), criterios Gherkin y diagramas de secuencia Mermaid. |
| **Marcus** | Senior Backend Architect | Claude 3.7 Sonnet (Thinking) | `backend/`: Motor Express + TypeScript, validadores de secuencias e-NCF y RNC módulo 10/11, cálculo de ITBIS 18% y generación de TrackID. |
| **Elena** | Senior Frontend Architect | Claude 3.5 Sonnet | `frontend/`: Interfaz moderna con Tailwind CSS, validación reactiva de comprobantes, métricas financieras en tiempo real y modal de emisión. |
| **Vector** | QA Automation Engineer | Claude 3.5 Sonnet | `tests/api-integration.test.mjs`: Suite de pruebas automatizadas E2E que valida contratos REST, cálculo de impuestos, rechazo de duplicados y errores 400/409. |
| **Echo** | Senior QA Auditor | DeepSeek-R1 (Reasoning) | `docs/QA_AUDIT_REPORT.md`: Matriz de casos extremos (Edge Cases), auditoría de seguridad impositiva y certificación final de pase a producción. |

---

## 🏛️ Soporte de Comprobantes e-CF Oficiales

- **E31:** Factura de Crédito Fiscal Electrónica
- **E32:** Factura de Consumo Electrónica
- **E33:** Nota de Débito Electrónica
- **E34:** Nota de Crédito Electrónica
- **E41:** Comprobante de Compras Electrónico
- **E44:** Pagos al Exterior

---

## 🚀 Estructura del Proyecto

```
medasoft-ecf-hub/
├── README.md                     # Documentación general y arquitectura
├── .gitignore                    # Reglas de exclusión de Git
├── docs/
│   ├── REQUIREMENTS.md           # [Sofia] Especificaciones de requerimientos SRS y Gherkin
│   └── QA_AUDIT_REPORT.md        # [Echo] Matriz de casos extremos y auditoría de calidad
├── backend/
│   ├── package.json              # Dependencias y scripts
│   ├── tsconfig.json             # Configuración TypeScript estricto
│   └── src/
│       ├── index.ts              # Servidor Express y middlewares
│       ├── types/invoice.ts      # Contratos e interfaces de dominio e-CF
│       ├── services/
│       │   ├── ncfValidator.ts   # Validador de estructura e-NCF y RNC
│       │   └── invoiceService.ts # Cálculo de ITBIS 18%, TrackIDs y almacén
│       └── routes/
│           ├── invoiceRoutes.ts  # Endpoints REST (/api/invoices)
│           └── dgiiRoutes.ts     # Health & Status WS DGII (/api/dgii)
├── frontend/
│   ├── index.html                # Dashboard responsivo con Tailwind CSS
│   ├── style.css                 # Estilos personalizados y animaciones
│   └── app.js                    # [Elena] Controlador reactivo y conexión a API
└── tests/
    ├── package.json              # Configuración de pruebas
    └── api-integration.test.mjs  # [Vector] Suite automatizada de integración
```

---

## ⚙️ Puesta en Marcha

### 1. Iniciar el Backend API (Marcus)

```bash
cd backend
npm install
npm run build
npm start
```
*El servidor iniciará en `http://localhost:4000` con los endpoints `/health`, `/api/dgii/status` y `/api/invoices`.*

### 2. Abrir el Frontend Dashboard (Elena)

Basta con abrir el archivo `frontend/index.html` en cualquier navegador web moderno, o servirlo con cualquier servidor estático:
```bash
# Ejemplo usando npx serve o python
cd frontend
python -m http.server 3001
```
*Visualice la interfaz ejecutiva en `http://localhost:3001`.*

### 3. Ejecutar las Pruebas de Integración (Vector)

Con el backend en ejecución en `http://localhost:4000`:
```bash
cd tests
node api-integration.test.mjs
```

---

## 📄 Licencia

Desarrollado para el ecosistema **Medasoft** bajo licencia MIT. Cumple con la normativa oficial DGII Ley 32-23 República Dominicana.
