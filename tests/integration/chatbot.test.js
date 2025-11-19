const request = require('supertest');
const { app } = require('../../src/app');
const { sequelize } = require('../../src/config/database');
const { Usuario, Cliente, Pelicula, Funcion, Sala, Silla } = require('../../src/models');

describe('Chatbot API', () => {
  let adminToken;
  let clienteToken;
  let clienteId;
  let peliculaId;
  let funcionId;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();

    // Create admin user and get token
    const adminExists = await Usuario.findOne({ where: { usuario: 'admin' } });
    if (!adminExists) {
      await Usuario.create({
        nombre: 'Admin Test',
        usuario: 'admin',
        contrasena: 'admin123',
        rol: 'ADMIN',
      });
    }

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        usuario: 'admin',
        contrasena: 'admin123',
      });
    adminToken = adminLogin.body.data.token;

    // Create test cliente
    const cliente = await Cliente.findOrCreate({
      where: { email: 'cliente.test@test.com' },
      defaults: {
        nombre: 'Cliente Test',
        email: 'cliente.test@test.com',
        telefono: '1234567890',
        tipo: 'NORMAL',
      },
    });
    clienteId = cliente[0].id_cliente;

    // Create test película
    const pelicula = await Pelicula.findOrCreate({
      where: { titulo: 'Pelicula Test Chatbot' },
      defaults: {
        titulo: 'Pelicula Test Chatbot',
        genero: 'Acción',
        duracion: 120,
        clasificacion: 'B15',
        sinopsis: 'Sinopsis de prueba',
        director: 'Director Test',
        estado: 'EN_CARTELERA',
        fecha_estreno: new Date(),
      },
    });
    peliculaId = pelicula[0].id_pelicula;

    // Create test sala
    const sala = await Sala.findOrCreate({
      where: { nombre: 'Sala Test Chatbot' },
      defaults: {
        nombre: 'Sala Test Chatbot',
        capacidad: 100,
        tipo: '2D',
        estado: 'ACTIVA',
      },
    });

    // Create test función
    const fechaFuncion = new Date();
    fechaFuncion.setDate(fechaFuncion.getDate() + 1);
    const funcion = await Funcion.findOrCreate({
      where: {
        id_pelicula: peliculaId,
        id_sala: sala[0].id_sala,
        fecha: fechaFuncion,
        hora: '18:00:00',
      },
      defaults: {
        id_pelicula: peliculaId,
        id_sala: sala[0].id_sala,
        fecha: fechaFuncion,
        hora: '18:00:00',
        precio: 15000,
      },
    });
    funcionId = funcion[0].id_funcion;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/chatbot/mensaje', () => {
    test('should process a greeting message', async () => {
      const response = await request(app)
        .post('/api/chatbot/mensaje')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mensaje: 'Hola',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.intencion).toBe('SALUDO');
      expect(response.body.data.respuesta.mensaje).toContain('Hola');
    });

    test('should process a recommendation request', async () => {
      const response = await request(app)
        .post('/api/chatbot/mensaje')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mensaje: '¿Qué me recomiendas?',
          id_cliente: clienteId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.intencion).toBe('PEDIR_RECOMENDACION');
      expect(response.body.data.respuesta).toBeDefined();
    });

    test('should process a movie search request', async () => {
      const response = await request(app)
        .post('/api/chatbot/mensaje')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mensaje: 'Quiero comprar boletos para Pelicula Test Chatbot',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.intencion).toBe('COMPRAR_BOLETOS');
    });

    test('should return error for empty message', async () => {
      const response = await request(app)
        .post('/api/chatbot/mensaje')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mensaje: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chatbot/mensaje')
        .send({
          mensaje: 'Hola',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/chatbot/sillas/:id_funcion', () => {
    test('should get seat availability for a function', async () => {
      const response = await request(app)
        .get(`/api/chatbot/sillas/${funcionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.sala).toBeDefined();
      expect(response.body.data.sillas_por_bloque).toBeDefined();
    });

    test('should return error for invalid function id', async () => {
      const response = await request(app)
        .get('/api/chatbot/sillas/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/chatbot/funciones/:id_pelicula', () => {
    test('should get functions for a movie', async () => {
      const response = await request(app)
        .get(`/api/chatbot/funciones/${peliculaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.funciones).toBeDefined();
      expect(Array.isArray(response.body.data.funciones)).toBe(true);
    });

    test('should filter functions by day', async () => {
      const response = await request(app)
        .get(`/api/chatbot/funciones/${peliculaId}?dia=viernes`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/chatbot/recomendaciones-personalizadas/:id_cliente', () => {
    test('should get personalized recommendations', async () => {
      const response = await request(app)
        .get(`/api/chatbot/recomendaciones-personalizadas/${clienteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should filter recommendations by day and time', async () => {
      const response = await request(app)
        .get(`/api/chatbot/recomendaciones-personalizadas/${clienteId}?dia=viernes&horario={"hora":20,"minutos":0}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/chatbot/populares', () => {
    test('should get popular movies', async () => {
      const response = await request(app)
        .get('/api/chatbot/populares')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/chatbot/estrenos', () => {
    test('should get recent releases', async () => {
      const response = await request(app)
        .get('/api/chatbot/estrenos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});







