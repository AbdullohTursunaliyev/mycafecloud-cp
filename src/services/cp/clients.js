import { cpApi } from "../../api/cp";

// GET /clients?search=&page=
export const fetchClients = (params = {}) => cpApi.clients(params);

// POST /clients
export const createClient = (payload) => cpApi.createClient(payload);

// POST /clients/{id}/topup
export const topupClient = (id, payload) => cpApi.topupClient(id, payload);

// GET /clients/{id}/history
export const clientHistory = (id) => cpApi.clientHistory(id);

