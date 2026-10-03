insert into knowledge_area (id_area, name) values
  (1, 'Ciencias de la Salud'),
  (2, 'Ingeniería y Tecnología'),
  (3, 'Ciencias Sociales y Humanidades'),
  (4, 'Ciencias Económicas y Administrativas'),
  (5, 'Ciencias Exactas y Naturales'),
  (6, 'Ciencias Agropecuarias y Ambientales'),
  (7, 'Arte y Diseño'),
  (8, 'Otra')
on conflict do nothing;

insert into major (id_major, fk_area, name) values
  (1,  4, 'Administración de Empresas'),
  (2,  7, 'Arquitectura'),
  (3,  5, 'Ciencias Naturales'),
  (4,  3, 'Ciencias Sociales'),
  (5,  3, 'Comunicación'),
  (6,  4, 'Contaduría Pública'),
  (7,  3, 'Derecho'),
  (8,  7, 'Diseño Gráfico'),
  (9,  4, 'Economía'),
  (10, 1, 'Educación Física y Deportes'),
  (11, 1, 'Enfermería'),
  (12, 5, 'Física-Matemática'),
  (13, 6, 'Ingeniería Agroindustrial'),
  (14, 6, 'Ingeniería Agronómica'),
  (15, 6, 'Ingeniería Ambiental'),
  (16, 2, 'Ingeniería Industrial'),
  (17, 2, 'Ingeniería de Sistemas'),
  (18, 2, 'Ingeniería en Energías Renovables'),
  (19, 3, 'Lengua y Literatura'),
  (20, 4, 'Marketing'),
  (21, 6, 'Medicina Veterinaria'),
  (22, 1, 'Psicología'),
  (23, 3, 'Trabajo Social'),
  (24, 4, 'Turismo Sostenible'),
  (25, 8, 'Otra')
on conflict do nothing;

insert into university_center (id_center, name) values
  (1, 'Universidad'),
  (2, 'Otra')
on conflict do nothing;

insert into study_modality (id_modality, name) values
  (1, 'Presencial'),
  (2, 'Semipresencial'),
  (3, 'Virtual')
on conflict do nothing;

insert into content_format (id_format, name) values
  (1,  'Reels (Instagram / Facebook)'),
  (2,  'Shorts (YouTube)'),
  (3,  'TikToks'),
  (4,  'Historias / Stories'),
  (5,  'Videos largos (YouTube, etc.)'),
  (6,  'Transmisiones en vivo / directos'),
  (7,  'Streams de videojuegos (Twitch, Kick)'),
  (8,  'Hilos / posts de texto (X, Threads)'),
  (9,  'Imágenes / Infografías'),
  (10, 'Audio / Podcast'),
  (11, 'Música'),
  (12, 'Lectura / Texto (blogs, artículos)'),
  (13, 'Cómics / Webtoons / Historietas'),
  (14, 'Cursos / Tutoriales en línea'),
  (15, 'Videojuegos'),
  (16, 'Libros')
on conflict do nothing;

insert into device (id_device, name) values
  (1, 'Teléfono'),
  (2, 'Computadora'),
  (3, 'Tablet'),
  (4, 'Televisión')
on conflict do nothing;

insert into physical_activity (id_activity, name) values
  (1, 'Sedentario / Ninguna'),
  (2, 'Ligera'),
  (3, 'Moderada'),
  (4, 'Intensa')
on conflict do nothing;

insert into ai_purpose (id_purpose, name) values
  (1,  'Estudiar'),
  (2,  'Trabajar'),
  (3,  'Redactar textos'),
  (4,  'Resumir'),
  (5,  'Programar'),
  (6,  'Buscar información'),
  (7,  'Traducir'),
  (8,  'Ideas creativas'),
  (9,  'Entretenimiento'),
  (10, 'Resolver dudas / tutoría'),
  (11, 'Corregir ortografía y gramática'),
  (12, 'Hacer tareas o trabajos'),
  (13, 'Generar imágenes'),
  (14, 'Análisis de datos'),
  (15, 'Planificar y organizarme'),
  (16, 'Crear presentaciones'),
  (17, 'Consejos personales'),
  (18, 'Compañía / conversar')
on conflict do nothing;

insert into ai_tool (id_tool, name) values
  (1,  'ChatGPT'),
  (2,  'Gemini'),
  (3,  'Copilot'),
  (4,  'Claude'),
  (5,  'DeepSeek'),
  (6,  'Meta AI'),
  (7,  'Perplexity'),
  (8,  'Otra'),
  (9,  'Grok'),
  (10, 'Character.AI'),
  (11, 'Midjourney'),
  (12, 'Notion AI'),
  (13, 'Qwen'),
  (14, 'Mistral / Le Chat')
on conflict do nothing;
