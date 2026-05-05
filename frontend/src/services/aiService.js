import api from "../utils/api";

export const sendMessage = (messages) => api.post("/ai/chat", { messages });