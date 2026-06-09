import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export const ENDPOINTS = {
  bills: "/bills",
  subscriptions: "/subscriptions",
  tasks: "/tasks",
  renewals: "/renewals",
  documents: "/documents",
  dashboard: "/dashboard/summary",
  calendar: "/calendar",
  chat: "/chat",
  chatHistory: "/chat/history",
  gmailStatus: "/gmail/status",
  gmailLogin: "/oauth/gmail/login",
  gmailScan: "/gmail/scan",
  gmailDisconnect: "/gmail/disconnect",
};
