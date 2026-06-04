/**
 * LogViewerDialog 组件 - 日志查看对话框
 *
 * 功能：
 * - 显示 xiaozhi.log 文件内容
 * - 支持日志检索/过滤功能
 * - 支持清理旧日志（只保留近两天）
 * - 支持清空全部日志
 * - 自动滚动到最新日志
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircleIcon,
  FileTextIcon,
  LoaderIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface LogViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogData {
  content: string;
  lines: number;
  size: number;
  path: string;
}

export function LogViewerDialog({
  isOpen,
  onClose,
}: LogViewerDialogProps) {
  const [logData, setLogData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 获取日志内容
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/logs?lines=2000");
      const result = await response.json();

      if (result.success) {
        setLogData(result.data);
      } else {
        toast.error("获取日志失败", {
          description: result.message || "未知错误",
        });
      }
    } catch (error) {
      toast.error("获取日志失败", {
        description: error instanceof Error ? error.message : "网络错误",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 清理旧日志（保留近两天）
  const cleanupLogs = useCallback(async () => {
    setCleaning(true);
    try {
      const response = await fetch("/api/logs/cleanup", {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("日志清理成功", {
          description: `删除了 ${result.data.removedLines} 行旧日志`,
        });
        // 刷新日志
        await fetchLogs();
      } else {
        toast.error("清理日志失败", {
          description: result.message || "未知错误",
        });
      }
    } catch (error) {
      toast.error("清理日志失败", {
        description: error instanceof Error ? error.message : "网络错误",
      });
    } finally {
      setCleaning(false);
    }
  }, [fetchLogs]);

  // 清空全部日志
  const clearLogs = useCallback(async () => {
    setClearing(true);
    try {
      const response = await fetch("/api/logs/clear", {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("日志清空成功", {
          description: `已删除 ${result.data.oldSize} 字节`,
        });
        // 刷新日志
        await fetchLogs();
      } else {
        toast.error("清空日志失败", {
          description: result.message || "未知错误",
        });
      }
    } catch (error) {
      toast.error("清空日志失败", {
        description: error instanceof Error ? error.message : "网络错误",
      });
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  }, [fetchLogs]);

  // 对话框打开时获取日志
  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  // 自动滚动到顶部（最新日志）
  useEffect(() => {
    if (logData && logContainerRef.current) {
      const timer = setTimeout(() => {
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = 0;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [logData]);

  // 过滤日志内容（最新日志显示在顶部）
  const filteredContent = useCallback(() => {
    if (!logData?.content) return "";

    const lines = logData.content.split("\n").filter((line) => line.trim());
    
    // 倒序排列，让最新日志显示在顶部
    const reversedLines = lines.reverse();
    
    if (!searchTerm.trim()) return reversedLines.join("\n");

    const filteredLines = reversedLines.filter((line) =>
      line.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filteredLines.join("\n");
  }, [logData, searchTerm]);

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ANSI 颜色转义序列处理
  const stripAnsiColors = (text: string) => {
    const ANSI_PATTERN = /\[(0|31|32|33|34|35|36|37|90|91|92|93|94|95|96|97)m/g;
    return text.replace(ANSI_PATTERN, "");
  };

  // 高亮搜索词
  const highlightSearchTerm = (text: string) => {
    if (!searchTerm.trim()) return stripAnsiColors(text);
    
    const strippedText = stripAnsiColors(text);
    const parts = strippedText.split(new RegExp(`(${searchTerm})`, "gi"));
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase()
        ? `<mark class="bg-yellow-200 text-black">${part}</mark>`
        : part
    ).join("");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon size={20} />
              日志查看
            </DialogTitle>
          </DialogHeader>

          {/* 搜索和操作栏 */}
          <div className="flex items-center gap-2 py-2">
            <div className="relative flex-1">
              <SearchIcon
                size={16}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="搜索日志内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCwIcon
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupLogs}
              disabled={cleaning}
            >
              <TrashIcon size={16} className={cleaning ? "animate-pulse" : ""} />
              清理旧日志
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={clearing}
            >
              <Trash2Icon size={16} className={clearing ? "animate-pulse" : ""} />
              清空日志
            </Button>
          </div>

          {/* 日志信息 */}
          {logData && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground py-1">
              <span>路径: {logData.path}</span>
              <span>行数: {logData.lines}</span>
              <span>大小: {formatSize(logData.size)}</span>
              {searchTerm && (
                <span>
                  匹配: {filteredContent().split("\n").filter(l => l.trim()).length} 行
                </span>
              )}
            </div>
          )}

          {/* 日志内容 */}
          <ScrollArea className="flex-1 border rounded-md">
            <div
              ref={logContainerRef}
              className="p-4 font-mono text-sm whitespace-pre-wrap break-all"
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <LoaderIcon size={24} className="animate-spin" />
                  <span className="ml-2">加载中...</span>
                </div>
              ) : logData?.content ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: highlightSearchTerm(filteredContent()),
                  }}
                />
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  暂无日志内容
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空日志确认对话框 */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircleIcon size={20} />
              确认清空日志
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              确定要清空所有日志内容吗？此操作将删除所有日志记录，且无法撤销。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={clearLogs} disabled={clearing}>
              <Trash2Icon size={16} className={clearing ? "animate-pulse" : ""} />
              确认清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}