#!/usr/bin/env python3
"""黑潮纪元本地开发服务器

功能：
  1. 静态文件服务（替代 python3 -m http.server）
  2. POST /api/save-annotations —— 将评论数据保存到 summaries/annotations.md

用法：
  cd novel && python3 server.py
  然后访问 http://localhost:8000/viewer/
"""

import json
import os
import sys
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "summaries")


class DevHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/save-annotations":
            self._save_annotations()
        else:
            self.send_error(404, "Not Found")

    def _save_annotations(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body)

            annotations = data.get("annotations", [])
            if not annotations:
                self._json_response(200, {"ok": True, "message": "无评论，跳过保存"})
                return

            lines = [
                "# 阅读评论汇总",
                "",
                f"> 自动保存时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                f"> 评论总数：{len(annotations)}",
                "",
            ]

            by_chapter = {}
            for ann in annotations:
                cid = ann.get("chapterId", "unknown")
                by_chapter.setdefault(cid, []).append(ann)

            for cid, anns in by_chapter.items():
                title = anns[0].get("chapterTitle", cid)
                lines.append(f"## {title}")
                lines.append("")
                for i, ann in enumerate(anns, 1):
                    lines.append(f"### 评论 {i}")
                    lines.append(f"- **划线文字**：「{ann.get('selectedText', '')}」")
                    lines.append(f"- **评论**：{ann.get('comment', '')}")
                    lines.append(f"- **位置偏移**：{ann.get('charOffset', '')}")
                    lines.append(f"- **时间**：{ann.get('createdAt', '')}")
                    lines.append("")

            os.makedirs(SAVE_DIR, exist_ok=True)
            out_path = os.path.join(SAVE_DIR, "annotations.md")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))

            rel = os.path.relpath(out_path)
            print(f"[annotations] 已保存 {len(annotations)} 条评论 → {rel}")
            self._json_response(200, {
                "ok": True,
                "message": f"已保存 {len(annotations)} 条评论",
                "path": rel,
            })

        except Exception as e:
            self._json_response(500, {"ok": False, "message": str(e)})

    def _json_response(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        msg = fmt % args
        if "/api/" in msg:
            sys.stderr.write(f"\033[36m[api]\033[0m {msg}\n")
        elif msg.startswith('"GET'):
            pass
        else:
            sys.stderr.write(f"{msg}\n")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(("", PORT), DevHandler)
    print(f"黑潮纪元开发服务器已启动：http://localhost:{PORT}/viewer/")
    print(f"评论将自动保存到：{os.path.join(SAVE_DIR, 'annotations.md')}")
    print("按 Ctrl+C 停止\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
