import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My Collection API",
      version: "0.1.0",
      description: "카드 컬렉션 / 포트폴리오 요약 / PSA Cert 조회용 API",
    },
    servers: [{ url: "/" }],
  },

  apis: ["./src/service/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);