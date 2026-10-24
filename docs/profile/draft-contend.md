# Contenido del portafolio: borrador 4

**Fuente:** hoja de vida de Anderson Zapata Bedoya y respuestas del 23 de octubre de 2026.
Lo que falta se marca como **[PENDIENTE]** y no se inventa.

**Regla de publicación (decidida por el administrador):** se nombra a BTG Pactual y se describen los proyectos realizados allí, pero **no se publica código de la empresa**. Las fichas cuentan problema, rol, solución y decisiones técnicas en términos generales, sin nombres de sistemas internos, volúmenes ni detalles de seguridad.

---

## Inicio

**Nombre:** Anderson Zapata Bedoya
**Titular:** Desarrollador Full Stack · Node.js · React · AWS
**Frase de valor (propuesta A):** Construyo aplicaciones de punta a punta, desde la interfaz hasta la infraestructura en la nube.
**Frase de valor (propuesta B):** Software financiero confiable, probado y desplegado en la nube.
**Botones:** Contactarme · Descargar CV · GitHub · LinkedIn

---

## Sobre mí

**Resumen corto (inicio y SEO):**
Desarrollador Full Stack con 2 años de experiencia en BTG Pactual Colombia, construyendo y soportando aplicaciones de pagos inmediatos, validación de listas restrictivas, bonos y CDTs.

**Resumen largo:**
Soy desarrollador Full Stack en Medellín y llevo 2 años en BTG Pactual Colombia, trabajando en productos financieros de principio a fin. Desarrollo interfaces con React y Angular, servicios con Node.js, TypeScript y Python, y los despliego sobre AWS con Terraform y Azure DevOps.

He participado en proyectos que automatizan procesos que antes eran manuales, he liderado migraciones de tecnología sin incidentes en producción y mantengo una cobertura de pruebas mínima del 90%. También acompaño a practicantes como mentor y hago revisiones de código.

Tengo la certificación AWS Certified Cloud Practitioner y estudio Ingeniería de Software. Este portafolio lo construí desde cero para explorar NestJS y mostrar abiertamente cómo trabajo, incluido el código y las decisiones de arquitectura.

**Cierre:** Busco una posición como desarrollador Full Stack donde pueda aportar a un producto real y seguir creciendo profesionalmente.

**Enfoque de trabajo (propuesta):**
- Calidad medible: pruebas, revisión de código y análisis estático.
- Automatización: CI/CD e infraestructura como código.
- Cambios sin sobresaltos: migraciones planeadas y sin incidentes.

---

## Experiencia

### Full Stack Development Analyst · BTG Pactual Colombia S.A.
**Abr 2025 – Actualidad · Medellín (híbrido)**
Equipo de 12 a 15 personas que desarrolla y soporta aplicaciones de medios de pago, bonos y CDTs.

- Desarrollo de funcionalidades a lo largo del flujo de conciliación diaria de transacciones Bre-B, sobre AWS ECS, Lambda, SQS, SNS y RDS.
- Participación en las definiciones técnicas y revisiones de diseño de un proceso que automatiza una conciliación que antes tomaba horas de trabajo manual.
- Desarrollo del hub interno de listas restrictivas (AML), con frontend en React 19 y Vite sobre CloudFront y búsqueda con AWS OpenSearch.
- Migración de una aplicación productiva de Node.js 18 a 22 y de Angular 12 a 17, sin incidentes en producción; propuse y ejecuté el paso de despliegues por releases a pipelines de CI/CD en Azure DevOps.
- Creación de módulos reutilizables de Terraform y plantillas de Azure Pipelines para desplegar servicios de AWS como OpenSearch y EventBridge.
- Procesos de carga y procesamiento de archivos para el módulo de bonos: inversionistas, operaciones, emisiones, rendimientos, registros contables y reportería.
- Soporte productivo a 2 aplicaciones de bonos y CDTs: diagnóstico y corrección de diferencias de saldos.
- Cobertura de pruebas mínima del 90% con Jest y Pytest, revisiones de código y mentoría de 3 practicantes.

### IT Development Intern · BTG Pactual Colombia S.A.
**Oct 2024 – Abr 2025 · Medellín**
Promovido a Full Stack Development Analyst tras 7 meses.

- Reducción del 90% de la deuda técnica del aplicativo de Bonos, según las métricas de SonarQube.
- Mejoras de interfaz en Angular y ajustes de lógica de negocio a partir de requerimientos funcionales.

### Educación y certificaciones
- **Ingeniería de Software**, Politécnico Grancolombiano. En curso, 2027 (quinto semestre).
- **Tecnólogo en Análisis y Desarrollo de Software**, SENA. Abr 2025. Su proyecto de grado fue reconocido como el mejor del año 2024.
- **Técnico en Sistemas**, SENA. Nov 2022.
- **AWS Certified Cloud Practitioner**, Amazon Web Services. Jun 2025 – jun 2028.

---

## Proyectos

Cada ficha indica si el código es público o privado. Los proyectos empresariales no tienen enlace a repositorio.

### 1. Conciliación de pagos inmediatos Bre-B *(destacado · código privado)*
- **Problema:** la conciliación diaria de transacciones de pagos inmediatos obligaba al equipo de tesorería a consultar tres fuentes de información al mismo tiempo. Era un trabajo manual, desgastante y propenso a errores humanos.
- **Mi rol:** desarrollo de funcionalidades a lo largo del flujo y participación en las definiciones técnicas y revisiones de diseño.
- **Solución:** un proceso automatizado que recibe archivos cifrados, valida la firma, los parsea, los carga en PostgreSQL y cruza la información contra el hub de pagos y el core bancario.
- **Stack:** AWS ECS, Lambda, SQS, SNS, RDS (PostgreSQL).
- **Decisiones técnicas:**
  - **ECS** para la etapa de conciliación, porque permite aprovechar las capacidades del hub de pagos para conciliar grandes cantidades de transacciones.
  - **Lambda** para los procesos de bajo volumen de cómputo y corta duración.
  - **SQS con colas de mensajes fallidos (DLQ)** para aislar los errores, y políticas de reintentos apoyadas en las capacidades nativas de SQS.
- **Resultado:** el proceso reemplazó un trabajo manual que podía tomar horas, según el volumen de transacciones del día, y eliminó la consulta simultánea de tres fuentes y el riesgo de error humano asociado.

### 2. Hub de listas restrictivas (AML) *(destacado · código privado)*
- **Problema:** las listas del área de cumplimiento debían centralizarse y consultarse desde los sistemas transaccionales.
- **Mi rol:** desarrollador del hub, frontend y servicio. Realicé pruebas de QA y revisiones de código, y quedé como encargado del proceso una vez pasó a producción.
- **Solución:** un hub que centraliza las listas cargadas por cumplimiento y expone un servicio para validar si un beneficiario aparece en ellas.
- **Stack:** React 19, Vite, CloudFront, AWS OpenSearch.
- **Decisiones técnicas:**
  - **AWS OpenSearch** para búsquedas rápidas, con un objetivo de tiempo de respuesta definido para las validaciones.
  - **Algoritmo Jaro-Winkler** aplicado sobre los resultados que devuelve OpenSearch: se vuelve a puntuar con este algoritmo en lugar de usar el puntaje nativo del motor, para tener control sobre la calidad de las coincidencias aproximadas de nombres.
- **Resultado:** validaciones rápidas que cumplen el objetivo de tiempo de respuesta y la calidad esperada por el equipo de AML, tanto en operaciones transaccionales como no transaccionales.

### 3. Migración de plataforma y paso a CI/CD *(destacado · código privado)*
- **Problema:** una aplicación productiva corría sobre Node.js 18 y Angular 12, con despliegues manuales por releases.
- **Mi rol:** propuse y ejecuté la migración.
- **Solución:** actualización a Node.js 22 y Angular 17, y pipelines de CI/CD en Azure DevOps.
- **Stack:** Node.js, Angular, Azure DevOps.
- **Decisiones técnicas:** migración por etapas, primero el backend y después el frontend, para limitar el riesgo de cada cambio. Para asegurar que todo lo existente siguiera funcionando, se combinaron pruebas automatizadas con pruebas manuales realizadas junto al equipo de QA.
- **Resultado:** migración sin incidentes en producción.

### 4. Aplicación de transporte accesible (proyecto de grado SENA) *(código público)*
- **Problema:** las personas con discapacidad tienen dificultades para acceder a servicios de transporte.
- **Mi rol:** desarrollador Full Stack.
- **Solución:** una plataforma con tres piezas: una app para el conductor, una app para el usuario y un módulo web de administración.
- **Stack:** Flutter con Dart y Firebase.
- **Módulo web de administración:** consulta la base de datos en Firebase para gestionar auditoría, viajes realizados, bloqueo de usuarios, aprobación de conductores y calificaciones de conductores.
- **Experiencia de usuario:** intuitiva. Las personas con discapacidad pueden solicitar viajes con facilidad, y los conductores aceptan viajes de forma sencilla y siguen la ruta indicada en el mapa.
- **Reconocimiento:** mejor proyecto de grado de 2024 (SENA).
- **Repositorio:** **[PENDIENTE]** enlace.

### 5. Este portafolio *(destacado · código público)*
- **Problema:** mostrar el perfil profesional y, a la vez, evidenciar cómo se construye software de calidad.
- **Solución:** sitio con React y NestJS, panel de administración, contenido público independiente del backend, tema claro y oscuro, pruebas y CI/CD.
- **Stack:** React, NestJS, TypeScript, PostgreSQL, Docker. **[PENDIENTE]** se completa con las decisiones del desarrollo.
- **Repositorio:** `Ander0907/anderson-zapata-portfolio`. Se detalla en la página de arquitectura.

### Otros trabajos (mencionados en experiencia, sin ficha propia)
Módulos de Terraform y plantillas de pipelines, y el módulo de bonos y CDTs.

---

## Habilidades

| Categoría | Tecnologías |
|---|---|
| **Frontend** | React, Angular, Vite |
| **Backend** | Node.js, TypeScript, Python, FastAPI, SQL; C#/.NET (básico) |
| **Nube (AWS)** | Lambda, ECS, RDS, DynamoDB, SQS, SNS, EventBridge, OpenSearch, CloudFront, CloudFormation, CloudWatch |
| **Bases de datos** | PostgreSQL, DynamoDB |
| **Infraestructura y CI/CD** | Terraform, Serverless Framework, Azure DevOps (Pipelines, Artifacts), Git |
| **Calidad y pruebas** | Jest, Pytest, SonarQube, revisión de código |
| **Móvil** | Flutter, Dart, Firebase |

**Idiomas:** español nativo, inglés A2.
**Nota:** NestJS se agrega a la lista al terminar este proyecto.

---

## Referencias

| Nombre | Cargo y empresa | LinkedIn | Texto |
|---|---|---|---|
| Santiago Pulgarin | Desarrollador Mid-level (fue mi líder técnico), Tyba | **[PENDIENTE]** | **[PENDIENTE]** |
| Jaider Osorio | Desarrollador Backend, Pragma | **[PENDIENTE]** | **[PENDIENTE]** |
| Sebastián Coneo | Desarrollador Full Stack, Plenti | **[PENDIENTE]** | **[PENDIENTE]** |

Los textos deben ser palabras de cada persona, con su permiso. No se redactan en su nombre.

---

## Contacto

**Título propuesto:** Hablemos
**Texto:** Si tienes una vacante en mente, escríbeme. Respondo lo antes posible.
**Datos públicos:** zapataander18@gmail.com · linkedin.com/in/anderson-zapata-bedoya · Medellín, Colombia
**Teléfono:** no se publica (decidido).
