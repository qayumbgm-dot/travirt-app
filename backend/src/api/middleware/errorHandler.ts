import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export const errorHandler = (
  error: FastifyError,
  _req: FastifyRequest,
  reply: FastifyReply,
): void => {
  // Fastify validation errors
  if (error.validation) {
    void reply.code(400).send({ error: 'Request validation failed', details: error.validation });
    return;
  }

  if (error.statusCode) {
    void reply.code(error.statusCode).send({ error: error.message });
    return;
  }

  // Unhandled — log and return generic 500
  console.error('[Unhandled error]', error);
  void reply.code(500).send({ error: 'Internal server error' });
};
