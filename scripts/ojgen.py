#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""ojgen —— 多平台 OJ 练习题数据生成框架（基于 CYaRon）。

支持平台:
    luogu          洛谷（每测试点独立 .in/.out）
    hdu / poj / zoj / nowcoder   stdin/stdout 类 OJ（用例拼接单流，EOF 多组）
    leetcode / nowcoder_core     核心代码模式（testcases.txt + answers.txt）

典型用法（新建 gen_xxx.py，与 ojgen.py 放同一目录）:

    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from ojgen import Gen, randint

    gen = Gen(platform="hdu", problem_id="1000", n=10,
              std="python std.py", out_dir="data/hdu1000", seed=20260815)
    for i in gen.cases():          # i 从 1 到 n
        a, b = randint(1, 10**9), randint(1, 10**9)
        gen.input_writeln(a, b)    # 写入第 i 个用例的输入
    gen.auto_output()              # 用标程逐用例生成输出（可选）
    gen.pack()                     # 按平台打包到 out_dir
"""

import json
import os
import random
import shutil
import subprocess
import sys
import time

from cyaron import *  # noqa: F401,F403  提供 randint、Graph、String 等

# 统一控制台/管道输出为 UTF-8（Windows GBK 控制台、CI 管道、跨平台一致）
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001  旧版本无 reconfigure 时忽略
        pass

STDIN_PLATFORMS = {"hdu", "poj", "zoj", "nowcoder"}
SERIAL_PLATFORMS = {"leetcode", "nowcoder_core"}
ALL_PLATFORMS = {"luogu"} | STDIN_PLATFORMS | SERIAL_PLATFORMS

__version__ = "1.1.0"


def _fmt(x):
    """把单个值转成输入文本 token；list/tuple 展开为空格分隔。"""
    if isinstance(x, (list, tuple)):
        return " ".join(_fmt(e) for e in x)
    if isinstance(x, bool):
        return "true" if x else "false"
    return str(x)


class Gen:
    """一次生成任务：按平台组织用例输入/输出并打包。"""

    def __init__(self, platform, problem_id, n, std=None, out_dir="data",
                 seed=None, input_suffix=".in", output_suffix=".out",
                 verbose=True, keep_work=False):
        platform = (platform or "").lower()
        if platform not in ALL_PLATFORMS:
            raise ValueError("不支持的平台 %r，可选: %s" % (platform, sorted(ALL_PLATFORMS)))
        n = int(n)
        if n < 1:
            raise ValueError("用例数 n 必须 >= 1")
        self.platform = platform
        self.problem_id = str(problem_id)
        self.n = n
        self.std = std
        self.out_dir = os.path.abspath(out_dir)
        self.in_suffix = input_suffix
        self.out_suffix = output_suffix
        self.verbose = verbose
        self.keep_work = keep_work
        self.seed = int(seed) if seed is not None else int(time.time())
        random.seed(self.seed)

        self._work = os.path.join(self.out_dir, ".work")
        self._case_id = None
        self._in_lines = []       # 当前用例输入行缓冲
        self._out_lines = []      # 当前用例输出行缓冲（手动答案）
        self._has_output = set()  # 已有输出的用例 id
        self._in_files = {}
        self._out_files = {}
        os.makedirs(self._work, exist_ok=True)
        if self.verbose:
            print("[ojgen] platform=%s pid=%s n=%d seed=%d out_dir=%s"
                  % (self.platform, self.problem_id, self.n, self.seed, self.out_dir))

    # ---------- 用例迭代 ----------

    def cases(self):
        """迭代 1..n；每次进入用例 i 时切换输入/输出缓冲，离开时落盘。"""
        for i in range(1, self.n + 1):
            self._case_id = i
            self._in_lines = []
            self._out_lines = []
            try:
                yield i
            finally:
                self._flush_case(i)

    # ---------- 写入接口（作用于当前用例） ----------

    def _require_case(self):
        if self._case_id is None:
            raise RuntimeError("必须在 for i in gen.cases(): 循环内写入")

    def input_writeln(self, *args):
        """当前用例输入追加一行，多个参数以空格分隔（等价 cyaron 的 input_writeln）。"""
        self._require_case()
        self._in_lines.append(" ".join(_fmt(a) for a in args))

    def input_write(self, *args):
        """不换行追加；若上一行未换行则拼接到行尾（等价 cyaron 的 input_write）。"""
        self._require_case()
        text = " ".join(_fmt(a) for a in args)
        if self._in_lines:
            self._in_lines[-1] += text
        else:
            self._in_lines.append(text)

    def input_raw(self, text):
        """原样追加多行文本（例如 graph.to_str() 的结果）。"""
        self._require_case()
        for line in str(text).splitlines():
            self._in_lines.append(line)

    def input_json(self, obj):
        """序列化平台：按 LeetCode 规则追加一个 JSON 值（json.dumps 紧凑格式）。"""
        self._require_case()
        self._in_lines.append(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))

    def output_writeln(self, *args):
        """手动写当前用例答案的一行（stdin/stdout 平台）。"""
        self._require_case()
        self._out_lines.append(" ".join(_fmt(a) for a in args))
        self._has_output.add(self._case_id)

    def output_raw(self, text):
        """手动写当前用例答案（多行原文）。"""
        self._require_case()
        for line in str(text).splitlines():
            self._out_lines.append(line)
        self._has_output.add(self._case_id)

    def output_json(self, obj):
        """手动写当前用例答案（序列化平台，一行一个 JSON 值）。"""
        self._require_case()
        self._out_lines.append(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
        self._has_output.add(self._case_id)

    # ---------- 内部落盘 ----------

    def _case_paths(self, i):
        return (os.path.join(self._work, "case_%d%s" % (i, self.in_suffix)),
                os.path.join(self._work, "case_%d%s" % (i, self.out_suffix)))

    def _flush_case(self, i):
        in_path, out_path = self._case_paths(i)
        with open(in_path, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(self._in_lines))
            if self._in_lines:
                f.write("\n")
        self._in_files[i] = in_path
        if self._out_lines:
            with open(out_path, "w", encoding="utf-8", newline="\n") as f:
                f.write("\n".join(self._out_lines))
                if self._out_lines:
                    f.write("\n")
            self._out_files[i] = out_path
        self._case_id = None

    # ---------- 标程生成输出 ----------

    def auto_output(self, std=None):
        """对没有手动输出的用例，逐用例把输入喂给标程得到输出。"""
        std = std or self.std
        if not std:
            raise ValueError("auto_output 需要 std 命令（如 \"python std.py\" 或 \"std.exe\"）")
        for i in range(1, self.n + 1):
            if i in self._has_output:
                continue
            in_path, out_path = self._case_paths(i)
            try:
                with open(in_path, "rb") as fin, open(out_path, "wb") as fout:
                    proc = subprocess.run(std, stdin=fin, stdout=fout,
                                          stderr=subprocess.PIPE, shell=True)
            except Exception as exc:  # noqa: BLE001
                raise RuntimeError("用例 %d 运行标程失败: %s" % (i, exc))
            if proc.returncode != 0:
                tail = proc.stderr.decode("utf-8", "replace")[-2000:]
                raise RuntimeError("用例 %d 标程退出码 %d\n%s" % (i, proc.returncode, tail))
            self._out_files[i] = out_path
            self._has_output.add(i)
            if self.verbose:
                print("[ojgen] case %d: std ok" % i)

    # ---------- 打包 ----------

    def pack(self):
        """按平台把 .work 里的用例整理为最终交付文件。"""
        missing_in = [i for i in range(1, self.n + 1) if i not in self._in_files]
        if missing_in:
            raise RuntimeError("有用例没有输入: %s" % missing_in)
        missing_out = [i for i in range(1, self.n + 1) if i not in self._out_files]
        if missing_out:
            raise RuntimeError("有用例没有输出（请写 output_* 或调用 auto_output）: %s" % missing_out)

        cases_dir = os.path.join(self.out_dir, "cases")
        shutil.rmtree(cases_dir, ignore_errors=True)
        os.makedirs(cases_dir, exist_ok=True)

        files = []

        def normalize_and_copy(src, dst):
            with open(src, "rb") as f:
                data = f.read().replace(b"\r\n", b"\n")
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, "wb") as f:
                f.write(data)
            files.append(os.path.relpath(dst, self.out_dir).replace(os.sep, "/"))
            return dst

        if self.platform == "luogu":
            for i in range(1, self.n + 1):
                normalize_and_copy(self._in_files[i],
                                   os.path.join(self.out_dir,
                                                "%s-%d%s" % (self.problem_id, i, self.in_suffix)))
                normalize_and_copy(self._out_files[i],
                                   os.path.join(self.out_dir,
                                                "%s-%d%s" % (self.problem_id, i, self.out_suffix)))
        else:
            for i in range(1, self.n + 1):
                normalize_and_copy(self._in_files[i],
                                   os.path.join(cases_dir, "%d%s" % (i, self.in_suffix)))
                normalize_and_copy(self._out_files[i],
                                   os.path.join(cases_dir, "%d%s" % (i, self.out_suffix)))

        if self.platform in STDIN_PLATFORMS:
            combined_in = os.path.join(self.out_dir, "%s%s" % (self.problem_id, self.in_suffix))
            combined_out = os.path.join(self.out_dir, "%s%s" % (self.problem_id, self.out_suffix))
            with open(combined_in, "wb") as f:
                for i in range(1, self.n + 1):
                    with open(self._in_files[i], "rb") as c:
                        f.write(c.read().replace(b"\r\n", b"\n"))
            with open(combined_out, "wb") as f:
                for i in range(1, self.n + 1):
                    with open(self._out_files[i], "rb") as c:
                        f.write(c.read().replace(b"\r\n", b"\n"))
            files.append(os.path.basename(combined_in))
            files.append(os.path.basename(combined_out))

        if self.platform in SERIAL_PLATFORMS:
            tc_path = os.path.join(self.out_dir, "testcases.txt")
            ans_path = os.path.join(self.out_dir, "answers.txt")
            with open(tc_path, "wb") as f:
                for i in range(1, self.n + 1):
                    with open(self._in_files[i], "rb") as c:
                        f.write(c.read().replace(b"\r\n", b"\n"))
            with open(ans_path, "wb") as f:
                for i in range(1, self.n + 1):
                    with open(self._out_files[i], "rb") as c:
                        f.write(c.read().replace(b"\r\n", b"\n"))
            files.append("testcases.txt")
            files.append("answers.txt")

        self._write_manifest(files)
        self._write_readme()

        if not self.keep_work:
            shutil.rmtree(self._work, ignore_errors=True)

        if self.verbose:
            print("[ojgen] 打包完成: %d 个用例 -> %s" % (self.n, self.out_dir))
            print("[ojgen] 文件:\n  " + "\n  ".join(files))
        return files

    def _write_manifest(self, files):
        manifest = {
            "tool": "ojgen %s" % __version__,
            "platform": self.platform,
            "problem_id": self.problem_id,
            "n_cases": self.n,
            "seed": self.seed,
            "std": self.std,
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "files": files,
        }
        with open(os.path.join(self.out_dir, "manifest.json"), "w",
                  encoding="utf-8", newline="\n") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
            f.write("\n")

    def _write_readme(self):
        if self.platform == "luogu":
            note = ("洛谷格式：每个测试点独立文件 %s-<i>%s/%s。\n"
                    "将全部 in/out（SPJ 题再加 checker.cpp）打包为一个 zip 上传。\n"
                    % (self.problem_id, self.in_suffix, self.out_suffix))
        elif self.platform in STDIN_PLATFORMS:
            note = ("%s 格式：%s%s 为全部用例按顺序拼接的单一输入流（EOF 多组）。\n"
                    "若题目要求首行 T 或哨兵终止，请在生成器中自行添加。\n"
                    "cases/ 目录为逐用例文件，便于对拍；本地判题示例:\n"
                    "  std.exe < %s%s > my.out\n"
                    % (self.platform.upper(), self.problem_id, self.in_suffix,
                       self.problem_id, self.in_suffix))
        else:
            note = ("%s 格式（核心代码模式）：testcases.txt 每行一个 JSON 序列化参数，\n"
                    "每个用例占 k 行（k = 参数个数）；answers.txt 每行一个答案 JSON 值，\n"
                    "与用例一一对应且同序。\n" % ("牛客" if self.platform == "nowcoder_core" else "LeetCode"))
        with open(os.path.join(self.out_dir, "README.txt"), "w",
                  encoding="utf-8", newline="\n") as f:
            f.write(note)
