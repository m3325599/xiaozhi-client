#!/usr/bin/env node

/**
 * WebServer 独立启动脚本
 * 用于后台模式启动，替代原有的 adaptiveMCPPipe 启动方式
 */

// 动态导入避免 CLI 代码执行
async function importModules() {
  const webServerModule = await import("./WebServer.js");
  const configModule = await import("../config/index.js");
  const loggerModule = await import("./Logger.js");
  return {
    WebServer: webServerModule.WebServer,
    configManager: configModule.configManager,
    logger: loggerModule.logger,
    setGlobalLogLevel: loggerModule.setGlobalLogLevel,
  };
}

async function main() {
  const args = process.argv.slice(2);

  try {
    // 动态导入模块
    const { WebServer, configManager, logger, setGlobalLogLevel } = await importModules();

    // 如果设置了日志级别，应用它
    if (process.env.XIAOZHI_LOG_LEVEL) {
      setGlobalLogLevel(process.env.XIAOZHI_LOG_LEVEL as any);
    }

    // 初始化日志
    if (process.env.XIAOZHI_CONFIG_DIR) {
      logger.initLogFile(process.env.XIAOZHI_CONFIG_DIR);
      logger.enableFileLogging(true);
    }

    // 启动 WebServer
    const webServer = new WebServer();
    await webServer.start();

    logger.info("[WEBSERVER_STANDALONE] WebServer 启动成功");

    // 处理退出信号
    const cleanup = async () => {
      logger.info("[WEBSERVER_STANDALONE] 正在停止 WebServer...");
      await webServer.stop();
      process.exit(0);
    };

    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
  } catch (error) {
    console.error("WebServer 启动失败:", error);
    process.exit(1);
  }
}

// 检查是否为直接执行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
