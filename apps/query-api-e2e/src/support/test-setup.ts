/* eslint-disable */

module.exports = async function () {
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';
  process.env.E2E_BASE_URL = `http://${host}:${port}`;
};
