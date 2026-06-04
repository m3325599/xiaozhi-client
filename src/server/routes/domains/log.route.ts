/**
 * 日志查看路由模块
 * 处理所有日志相关的 API 路由
 */

import type { RouteDefinition } from "../../routes/types.js";
import { createHandler } from "../../routes/types.js";

const h = createHandler("logHandler");

/**
 * 日志路由定义
 */
export const logRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/logs",
    handler: h((handler, c) => handler.getLogs(c)),
  },
  {
    method: "POST",
    path: "/api/logs/cleanup",
    handler: h((handler, c) => handler.cleanupLogs(c)),
  },
];