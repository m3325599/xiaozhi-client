/**
 * 日志查看 API 处理器
 * 提供日志文件读取和清理功能
 */

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Context } from "hono";
import type { AppContext } from "../types/hono.context";
import { BaseHandler } from "./base.handler";

/**
 * 获取日志文件路径（服务器端专用）
 */
function getLogFilePath(): string {
  return path.join(process.cwd(), "xiaozhi.log");
}

/**
 * 日志查看 API 处理器
 */
export class LogHandler extends BaseHandler {
  /**
   * 获取日志文件内容
   * GET /api/logs
   * Query: ?lines=1000 (可选，默认读取全部)
   */
  async getLogs(c: Context<AppContext>): Promise<Response> {
    try {
      const linesParam = c.req.query("lines");
      const maxLines = linesParam ? Number.parseInt(linesParam, 10) : 0;

      // 获取日志文件路径
      const logFilePath = getLogFilePath();
      const logger = c.get("logger");

      logger.info("读取日志文件", { path: logFilePath, maxLines });

      // 检查文件是否存在
      if (!existsSync(logFilePath)) {
        return c.success(
          { content: "", lines: 0, size: 0 },
          "日志文件不存在"
        );
      }

      // 读取文件内容
      const content = readFileSync(logFilePath, "utf-8");
      const fileStat = statSync(logFilePath);

      // 如果指定了行数限制，只返回最后 N 行
      let resultContent = content;
      let resultLines = 0;

      if (maxLines > 0) {
        const allLines = content.split("\n");
        resultLines = Math.min(allLines.length, maxLines);
        resultContent = allLines.slice(-maxLines).join("\n");
      } else {
        resultLines = content.split("\n").filter((line) => line.trim()).length;
      }

      return c.success(
        {
          content: resultContent,
          lines: resultLines,
          size: fileStat.size,
          path: logFilePath,
        },
        "日志读取成功"
      );
    } catch (error) {
      return this.handleError(c, error, "读取日志文件", "LOG_READ_FAILED");
    }
  }

  /**
   * 清理日志文件（只保留近两天的日志）
   * POST /api/logs/cleanup
   */
  async cleanupLogs(c: Context<AppContext>): Promise<Response> {
    try {
      const logFilePath = getLogFilePath();
      const logger = c.get("logger");

      logger.info("清理日志文件", { path: logFilePath });

      // 检查文件是否存在
      if (!existsSync(logFilePath)) {
        return c.success(
          { removedLines: 0, keptLines: 0 },
          "日志文件不存在，无需清理"
        );
      }

      // 读取文件内容
      const content = readFileSync(logFilePath, "utf-8");
      const lines = content.split("\n");

      // 计算两天前的时间戳
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoTimestamp = twoDaysAgo.getTime();

      // 过滤保留近两天的日志
      // 日志格式示例: [2026-06-04 03:40:25] ...
      const keptLines: string[] = [];
      const timestampRegex = /^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\]/;

      for (const line of lines) {
        if (!line.trim()) {
          // 保留空行（用于分隔）
          continue;
        }

        const match = line.match(timestampRegex);
        if (match) {
          const dateStr = match[1]; // 2026-06-04
          const timeStr = match[2]; // 03:40:25
          const lineDate = new Date(`${dateStr} ${timeStr}`);

          if (lineDate.getTime() >= twoDaysAgoTimestamp) {
            keptLines.push(line);
          }
        } else {
          // 没有时间戳的行，保留（可能是多行日志的后续部分）
          keptLines.push(line);
        }
      }

      // 写入清理后的内容
      const newContent = keptLines.join("\n");
      writeFileSync(logFilePath, newContent, "utf-8");

      const removedLines = lines.length - keptLines.length;
      const newFileStat = statSync(logFilePath);

      logger.info("日志清理完成", {
        removedLines,
        keptLines: keptLines.length,
        newSize: newFileStat.size,
      });

      return c.success(
        {
          removedLines,
          keptLines: keptLines.length,
          newSize: newFileStat.size,
        },
        `日志清理成功，删除了 ${removedLines} 行旧日志`
      );
    } catch (error) {
      return this.handleError(c, error, "清理日志文件", "LOG_CLEANUP_FAILED");
    }
  }
}