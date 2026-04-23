# Manual de Usuario - Special Clean Oil

Bienvenido al sistema de inventario y trazabilidad QR de **Special Clean Oil**. Este manual está diseñado para guiar a todos los usuarios (Administradores, Bodegueros y Vendedores) en el uso óptimo de la plataforma, detallando flujos de trabajo, razones de ser de cada módulo y buenas prácticas.

---

## Índice
1. [Introducción y Roles de Usuario](#1-introducción-y-roles-de-usuario)
2. [Flujo Principal del Sistema](#2-flujo-principal-del-sistema)
3. [Módulos de la Aplicación](#3-módulos-de-la-aplicación)
   - [Dashboard](#dashboard)
   - [Productos y Categorías](#productos-y-categorías)
   - [Generación y Escaneo QR](#generación-y-escaneo-qr)
   - [Cadena de Suministro (Proveedores)](#cadena-de-suministro-proveedores)
   - [Pedidos y Entregas](#pedidos-y-entregas)
   - [Encuestas de Satisfacción](#encuestas-de-satisfacción)
   - [Reportes y Finanzas](#reportes-y-finanzas)
4. [Buenas Prácticas de Negocios Verdes](#4-buenas-prácticas-de-negocios-verdes)

---

## 1. Introducción y Roles de Usuario

El sistema busca tener una trazabilidad **de extremo a extremo**, desde que se recibe la materia prima hasta que el cliente final escanea un producto para conocer su origen, validando la autenticidad y reportando su satisfacción.

### Roles y Permisos:
- **Administrador (Admin):** Tiene acceso total. Es el único que puede eliminar registros (Proveedores, Pedidos, Encuestas, Productos), gestionar categorías, crear encuestas, agregar usuarios y ver reportes financieros detallados.
- **Bodeguero:** Encargado del inventario físico. Puede gestionar el stock, crear productos, realizar movimientos, confirmar la recepción de materia prima desde los proveedores y despachar los pedidos finales. No tiene acceso a reportes financieros.
- **Vendedor:** Encargado de la relación con el cliente. Puede ver el inventario disponible, registrar nuevos pedidos, gestionar información de clientes y revisar resultados de encuestas de satisfacción.

---

## 2. Flujo Principal del Sistema

1. **Ingreso de Materia Prima:** El Administrador o Bodeguero registra un pedido de materia prima a un proveedor. Al recibirlo, se realiza una **calificación de Negocios Verdes** al proveedor y se actualiza el stock automáticamente.
2. **Producción e Inventario:** Los productos finales se registran en el sistema. Se generan etiquetas con Códigos QR únicos para cada lote o producto, ubicados en estantes virtuales.
3. **Ventas y Despachos:** El Vendedor recibe una compra de un cliente y crea un "Pedido". Posteriormente, el Bodeguero prepara el pedido, anota la empresa transportadora y el **Número de Guía**, y lo despacha, descontando el inventario.
4. **Validación del Cliente:** El cliente final escanea el Código QR del producto físico, verificando su autenticidad y el trayecto del producto.
5. **Satisfacción (Post-venta):** Se le envía al cliente un enlace a una Encuesta de Satisfacción dinámica. Sus respuestas nutren las estadísticas de la plataforma.

---

## 3. Módulos de la Aplicación

### Dashboard
- **Propósito:** Ofrecer un resumen rápido y en tiempo real de la salud del negocio.
- **Uso:** Al iniciar sesión, verás indicadores clave (KPIs) como productos en bajo stock, alertas de caducidad, total de usuarios y movimientos recientes. 

### Productos y Categorías
- **Propósito:** Mantener el catálogo actualizado.
- **Uso:**
  - Solo el Admin crea Categorías.
  - El Bodeguero y Admin pueden añadir Productos.
  - **Stock Mínimo:** Configurar un stock mínimo es crucial, ya que el sistema te alertará automáticamente en el Dashboard cuando las unidades caigan por debajo de este límite.

### Generación y Escaneo QR
- **Propósito:** Garantizar trazabilidad y autenticidad frente al cliente.
- **Uso:** 
  - Al generar un QR para un lote, puedes imprimir las etiquetas y pegarlas físicamente.
  - El módulo de Escaneo utiliza la cámara del celular o tablet para identificar el ítem rápidamente dentro del almacén.

### Cadena de Suministro (Proveedores)
- **Propósito:** Medir la eficiencia y la responsabilidad socioambiental de nuestros aliados.
- **Uso:**
  - El Admin puede registrar y gestionar proveedores.
  - Cuando se hace un Pedido a Proveedor y este es recibido, se abrirá un modal de **Confirmar Entrega y Recepción**.
  - Aquí se requiere ingresar las **Calificaciones Negocios Verdes**: Sostenibilidad, Impacto Ambiental, Libre de Químicos y Calidad de Plantas. 
  - *Nota:* Si un proveedor dice "Sin calificar", es porque aún no se le ha recepcionado ninguna entrega bajo los nuevos estándares.

### Pedidos y Entregas
- **Propósito:** Coordinar la venta con la entrega física.
- **Uso:**
  - **Crear Pedido:** El vendedor busca un cliente, selecciona los productos, y se resta virtualmente el stock para separarlo.
  - **Despachar (Bodeguero/Admin):** Una vez empacado, se confirma el despacho anotando la "Transportadora" y el "Número de Guía". 
  - *Visibilidad:* El número de guía ahora siempre estará visible de color verde en la tarjeta principal del pedido para facilitar el seguimiento.

### Encuestas de Satisfacción
- **Propósito:** Recopilar retroalimentación post-venta del cliente final.
- **Uso:**
  - El Admin puede **crear** plantillas de encuestas flexibles.
  - **Preguntas Predeterminadas:** Puedes activar o desactivar preguntas estándar con un solo interruptor.
  - **Preguntas Personalizadas:** Añade preguntas de "Selección única" o "Múltiple", según la necesidad temporal de marketing.
  - El sistema generará un enlace público y un Código QR que puede ser compartido por redes sociales o impreso.

### Reportes y Finanzas
- **Propósito:** Analítica de ventas.
- **Uso:** (Solo Admin y Vendedor)
  - Visualiza el total ingresado, gráficos de tendencias y consolidado contable.
  - Los datos se calculan dinámicamente sumando solo los pedidos entregados/despachados.

---

## 4. Buenas Prácticas de Negocios Verdes

Special Clean Oil está comprometido con la sostenibilidad. La sección de **Cadena de Suministro** es vital para este objetivo.
- **Responsabilidad:** No otorgues "5 estrellas" por defecto. Evalúa responsablemente. Si un lote de materia prima llegó con pesticidas, la calificación de "Libre de Químicos" debe bajar (1-2 estrellas).
- El sistema automáticamente promedia las calificaciones a lo largo del tiempo. Un mal lote bajará el promedio, pero las futuras buenas entregas lo irán recuperando, mostrando un comportamiento realista del proveedor.

---
*Este manual es una guía viva y puede ser complementado a medida que el sistema crezca.*
