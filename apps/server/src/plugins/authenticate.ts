import fp from "fastify-plugin";
import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken, type JwtPayload } from "../lib/auth.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export default fp(async (app) => {
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const header = request.headers.authorization;
      const token =
        header && header.startsWith("Bearer ")
          ? header.slice("Bearer ".length)
          : (request.query as Record<string, string> | undefined)?.token;
      if (!token) {
        return reply.code(401).send({ error: "missing_token" });
      }
      try {
        request.user = verifyToken(token);
      } catch {
        return reply.code(401).send({ error: "invalid_token" });
      }
    },
  );
});
