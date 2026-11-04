// Especificacion OpenAPI 3.0 de la API. Se sirve en /openapi.json y la UI en /docs.
const instanceHeader = {
  'X-Instance': {
    description: 'Hostname de la instancia que atendio la peticion (sirve para ver el balanceo del ALB)',
    schema: { type: 'string' },
  },
};

const dbError = {
  description: 'La base de datos no responde',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'DGITI API',
    version: '1.0.0',
    description:
      'API minima de la evaluacion final DGITI (ALB + Auto Scaling Group + RDS PostgreSQL con replica).',
  },
  servers: [{ url: '/', description: 'Servidor actual (local o ALB)' }],
  tags: [
    { name: 'Validacion', description: 'Endpoints para comprobar el servicio' },
    { name: 'Items', description: 'CRUD minimo sobre PostgreSQL' },
    { name: 'Carga', description: 'Apoyo para pruebas de desempeno' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Validacion'],
        summary: 'Health check del ALB',
        description: 'No depende de la base de datos.',
        responses: {
          200: {
            description: 'Servicio vivo',
            headers: instanceHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    instance: { type: 'string', example: 'ip-10-0-11-25.ec2.internal' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/test': {
      get: {
        tags: ['Validacion'],
        summary: 'Valida app -> RDS primaria y lectura desde la replica',
        responses: {
          200: {
            description: 'Conexion correcta',
            headers: instanceHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    instance: { type: 'string' },
                    db_time: { type: 'string', format: 'date-time' },
                    read_connection_is_replica: {
                      type: 'boolean',
                      description: 'true si la lectura se hizo contra la replica',
                    },
                  },
                },
              },
            },
          },
          503: dbError,
        },
      },
    },
    '/api/items': {
      get: {
        tags: ['Items'],
        summary: 'Lista los ultimos 50 items (lee de la replica)',
        responses: {
          200: {
            description: 'Lista de items',
            headers: instanceHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    instance: { type: 'string' },
                    items: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
                  },
                },
              },
            },
          },
          503: dbError,
        },
      },
      post: {
        tags: ['Items'],
        summary: 'Crea un item (escribe en la primaria)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', example: 'mi item' } },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Item creado',
            headers: instanceHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    instance: { type: 'string' },
                    item: { $ref: '#/components/schemas/Item' },
                  },
                },
              },
            },
          },
          400: {
            description: 'name faltante o vacio',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          503: dbError,
        },
      },
    },
    '/api/load': {
      get: {
        tags: ['Carga'],
        summary: 'Consume CPU a proposito (para k6 y el escalado del ASG)',
        parameters: [
          {
            name: 'ms',
            in: 'query',
            description: 'Milisegundos de CPU por peticion (1-200)',
            schema: { type: 'integer', minimum: 1, maximum: 200, default: 30 },
          },
        ],
        responses: {
          200: {
            description: 'CPU consumida',
            headers: instanceHeader,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    instance: { type: 'string' },
                    burned_ms: { type: 'integer', example: 30 },
                    x: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Item: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'mi item' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          instance: { type: 'string' },
          error: { type: 'string' },
        },
      },
    },
  },
};
