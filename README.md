# BigQuery Release Notes Tracker 🚀

Una aplicación web moderna y elegante desarrollada con **Python Flask, HTML5, Vanilla CSS y JavaScript** que permite monitorizar, buscar y filtrar las notas de la versión oficiales de Google Cloud BigQuery, así como componer y publicar actualizaciones de forma rápida en Twitter (X).

---

## ✨ Características Principales

*   **Ingesta en Tiempo Real y Caché Inteligente:** Obtiene los datos directamente desde el feed Atom oficial de Google Cloud y los almacena en caché en memoria durante 5 minutos para maximizar la velocidad.
*   **Actualización Manual:** Permite forzar la sincronización en cualquier momento mediante un botón con indicador de carga animado.
*   **Separación Granular de Notas:** El backend separa inteligentemente los lanzamientos del mismo día en tarjetas independientes (según etiquetas `<h3>`), permitiendo interactuar con cada cambio individualmente.
*   **Búsqueda y Filtros Rápidos:** Buscador por texto libre y filtros interactivos por tipo de actualización (*Feature*, *Announcement*, *Issue*, *Deprecated*) que se procesan al instante en el cliente.
*   **Integración con Twitter (X):**
    *   Comparte de forma individual o selecciona múltiples notas de versión en bloque.
    *   Compositor de Tweets integrado en un modal con previsualización editable y contador de caracteres en tiempo real.
    *   Redirección mediante *Twitter Web Intent* segura y sin APIs de pago externas.
*   **Diseño Premium:** Interfaz con tema oscuro moderno, bordes de tarjeta con gradientes en *hover* y diseño totalmente responsivo adaptado para dispositivos móviles.

---

## 🛠️ Tecnologías Utilizadas

*   **Backend:** Python 3.x, Flask, Requests.
*   **Parser XML/Atom:** Librerías nativas (`xml.etree.ElementTree` y `re`).
*   **Frontend:** HTML5 semántico, Vanilla CSS (CSS Variables, Flexbox, CSS Grid y Backdrop blur), JavaScript ES6.
*   **Recursos Externos:** Fuente *Inter* (Google Fonts) e iconos *FontAwesome* (v6).

---

## 📂 Estructura del Proyecto

```text
bq-releases-notes/
├── templates/
│   └── index.html         # Plantilla principal del Dashboard
├── static/
│   ├── css/
│   │   └── style.css      # Hoja de estilos (Tema oscuro, animaciones y responsive)
│   └── js/
│       └── app.js         # Lógica JavaScript (Consumo API, filtros, tweets y modales)
├── app.py                 # Servidor Flask backend, parseador y caché
├── requirements.txt       # Dependencias de Python
├── .gitignore             # Archivos excluidos de Git
└── README.md              # Documentación del proyecto (este archivo)
```

---

## 🚀 Instalación y Ejecución

### Requisitos Previos
*   Tener instalado **Python 3.8 o superior**.
*   Tener instalado **Git** (opcional, para versionamiento).

### Paso 1: Clonar e ingresar al directorio
Si estás en tu máquina local, navega a la carpeta del proyecto:
```bash
cd D:\agy-cli-projects\bq-releases-notes
```

### Paso 2: Instalar Dependencias
Instala los paquetes necesarios definidos en `requirements.txt`:
```bash
pip install -r requirements.txt
```

### Paso 3: Lanzar la Aplicación
Inicia el servidor Flask ejecutando:
```bash
python app.py
```
El servidor se iniciará localmente en el puerto `5000`.

### Paso 4: Abrir en el Navegador
Abre tu navegador de preferencia e ingresa a la siguiente dirección:
👉 **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 🐦 Cómo publicar notas en Twitter

1.  **Publicación Simple:** Haz clic en el botón de compartir (icono de Twitter) en cualquier tarjeta de notas de versión. Esto abrirá el compositor con el borrador generado para esa nota específica.
2.  **Publicación Múltiple (Resumen):** 
    *   Selecciona las notas marcando los checkboxes en la esquina superior derecha de las tarjetas.
    *   Haz clic en **"Publicar en Twitter"** en el panel flotante que aparece en la parte inferior.
    *   El sistema recopilará un boletín condensado de todas las notas seleccionadas.
3.  **Redirección:** Modifica el texto libremente en el modal de previsualización y haz clic en **"Publicar Tweet"** para enviarlo de forma automática a la ventana de Twitter (X).
