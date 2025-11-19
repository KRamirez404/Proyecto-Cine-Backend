require('dotenv').config();
const { sequelize, testConnection } = require('../config/database');
const { Usuario, Cliente, Sala, Pelicula } = require('../models');
const { inicializarSalasSillas } = require('../services/salaService');
const logger = require('../utils/logger');

const seedDatabase = async () => {
  try {
    logger.info('🌱 Iniciando seeding de la base de datos...');

    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    // Create rooms
    logger.info('📍 Creando salas...');
    const salas = await Sala.bulkCreate([
      {
        nombre: 'Sala 1',
        capacidad: 260,
        tipo: '2D',
        estado: 'ACTIVA',
      },
      {
        nombre: 'Sala 2',
        capacidad: 260,
        tipo: '3D',
        estado: 'ACTIVA',
      },
      {
        nombre: 'Sala 3',
        capacidad: 260,
        tipo: '2D',
        estado: 'ACTIVA',
      },
    ], { ignoreDuplicates: true });
    logger.info(`✅ Creadas ${salas.length} salas`);

    // Create users
    logger.info('👥 Creando usuarios...');
    const usuarios = await Usuario.bulkCreate([
      {
        nombre: 'Administrador Principal',
        usuario: 'admin@cine',
        contrasena: 'admin123', // Will be hashed by model hook
        rol: 'ADMIN',
      },
      {
        nombre: 'Juan Cajero',
        usuario: 'cajero1@cine',
        contrasena: 'cajero123',
        rol: 'CAJERO',
      },
      {
        nombre: 'María Cajero',
        usuario: 'cajero2@cine',
        contrasena: 'cajero123',
        rol: 'CAJERO',
      },
    ], { ignoreDuplicates: true });
    logger.info(`✅ Creados ${usuarios.length} usuarios`);

    // Create clients
    logger.info('🎫 Creando clientes...');
    const clientes = await Cliente.bulkCreate([
      {
        nombre: 'Carlos VIP García',
        email: 'carlos.vip@email.com',
        telefono: '3001234567',
        tipo: 'VIP',
      },
      {
        nombre: 'Ana VIP Martínez',
        email: 'ana.vip@email.com',
        telefono: '3009876543',
        tipo: 'VIP',
      },
      {
        nombre: 'Pedro Rodríguez',
        email: 'pedro@email.com',
        telefono: '3005555555',
        tipo: 'NORMAL',
      },
      {
        nombre: 'Laura Gómez',
        email: 'laura@email.com',
        telefono: '3006666666',
        tipo: 'NORMAL',
      },
      {
        nombre: 'Diego López',
        email: 'diego@email.com',
        telefono: '3007777777',
        tipo: 'NORMAL',
      },
    ], { ignoreDuplicates: true });
    logger.info(`✅ Creados ${clientes.length} clientes`);

    // Create movies
    logger.info('🎬 Creando películas...');
    const peliculas = await Pelicula.bulkCreate([
      {
        titulo: 'Avengers: Endgame',
        genero: 'Acción',
        duracion: 181,
        clasificacion: 'PG-13',
        sinopsis: 'Los Vengadores restantes deben encontrar una manera de recuperar a sus aliados y derrotar a Thanos de una vez por todas.',
        director: 'Anthony y Joe Russo',
        estado: 'EN_CARTELERA',
        fecha_estreno: new Date('2024-01-15'),
      },
      {
        titulo: 'Intensamente 2',
        genero: 'Animación',
        duracion: 96,
        clasificacion: 'G',
        sinopsis: 'Riley entra en la adolescencia y nuevas emociones llegan al cuartel general.',
        director: 'Kelsey Mann',
        estado: 'EN_CARTELERA',
        fecha_estreno: new Date('2024-06-14'),
      },
      {
        titulo: 'Oppenheimer',
        genero: 'Drama',
        duracion: 180,
        clasificacion: 'R',
        sinopsis: 'La historia de J. Robert Oppenheimer y su rol en el desarrollo de la bomba atómica.',
        director: 'Christopher Nolan',
        estado: 'EN_CARTELERA',
        fecha_estreno: new Date('2023-07-21'),
      },
    ], { ignoreDuplicates: true });
    logger.info(`✅ Creadas ${peliculas.length} películas`);

    // Initialize seats for all rooms
    logger.info('💺 Inicializando sillas para todas las salas...');
    const resultSillas = await inicializarSalasSillas();
    logger.info(`✅ ${resultSillas.message}`);

    logger.info('');
    logger.info('🎉 ¡Seeding completado exitosamente!');
    logger.info('');
    logger.info('📊 Resumen:');
    logger.info(`   - Salas: ${salas.length}`);
    logger.info(`   - Sillas totales: ${resultSillas.totalSillas || 780}`);
    logger.info(`   - Usuarios: ${usuarios.length} (1 Admin, 2 Cajeros)`);
    logger.info(`   - Clientes: ${clientes.length} (2 VIP, 3 NORMAL)`);
    logger.info(`   - Películas: ${peliculas.length}`);
    logger.info('');
    logger.info('🔐 Credenciales de acceso:');
    logger.info('   Admin: usuario="admin", contraseña="admin123"');
    logger.info('   Cajero 1: usuario="cajero1", contraseña="cajero123"');
    logger.info('   Cajero 2: usuario="cajero2", contraseña="cajero123"');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error durante el seeding:', error);
    await sequelize.close();
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
