// OJ 练习题数据生成器 —— DSH 动态 Cordis 插件 · Host 半区
// 来源：ojgen-1/pkg-7（当前运行版本，DSH 动态插件）
// 说明：本文件是 cordis_define 的 code.host 函数体（return { apply(ctx) {...} }），
// 配合同目录 client.js 作为 code.client 重新定义后，经 cordis_run 激活。
// 依赖：ctx.get('fs') / ctx.get('subprocess') / ctx.get('sandboxPolicy')（均为可选，缺省时报错）；
// harness.handle 注册 Client 可调的 Package 私有 RPC：ojgen.env-check / ojgen.generate / ojgen.defaults；
// harness.defineTool + harness.registerTool 注册模型工具 generate_oj_data。
// 默认输出目录：<会话 cwd 或 workspaceRoot>/ojgen-project/generated/<platform>-<pid>。
"use strict";
module.exports = function () {
return {
  apply(ctx) {
    const fs = ctx.get('fs')
    const subprocess = ctx.get('subprocess')
    const sandboxPolicy = ctx.get('sandboxPolicy')
    const workspaceRoot = sandboxPolicy ? String(sandboxPolicy.workspaceRoot || '') : ''
    const PLATFORMS = ['luogu', 'hdu', 'poj', 'zoj', 'nowcoder', 'nowcoder_core', 'leetcode']
    const PY_ENV = { PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PYTHONUNBUFFERED: '1' }
    let lastSessionCwd = ''

    // 内置 ojgen.py 副本（与 scripts/ojgen.py 保持一致；运行时优先读取项目文件）
    const OJGEN_EMBEDDED = String.raw`#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""ojgen —— 多平台 OJ 练习题数据生成框架（基于 CYaRon）。

支持平台:
    luogu          洛谷（每测试点独立 .in/.out）
    hdu / poj / zoj / nowcoder   stdin/stdout 类 OJ（用例拼接单流，EOF 多组）
    leetcode / nowcoder_core     核心代码模式（testcases.txt + answers.txt）
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
`

    function sanitizeSegment(s) {
      return String(s).replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)
    }

    function sessionCwdOf(exec) {
      try {
        const agent = exec && exec.agent
        const session = agent && agent.session
        const header = session && session.header
        if (header && typeof header.cwd === 'string' && header.cwd !== '') return header.cwd
      } catch (e) { /* 无执行上下文或字段不可读时回退 */ }
      return ''
    }

    function defaultBaseOf(exec) {
      const sessionCwd = sessionCwdOf(exec)
      if (sessionCwd !== '') { lastSessionCwd = sessionCwd; return sessionCwd }
      return lastSessionCwd !== '' ? lastSessionCwd : workspaceRoot
    }

    function defaultOutDir(platform, pid, base) {
      return base + '/ojgen-project/generated/' + sanitizeSegment(platform) + '-' + sanitizeSegment(pid)
    }

    async function resolvePython() {
      if (subprocess === undefined) throw new Error('subprocess 服务不可用，无法运行 Python')
      let lastErr = null
      const candidates = ['python', 'python3', 'py']
      for (let k = 0; k < candidates.length; k++) {
        try { return await subprocess.resolveExecutable(candidates[k], PY_ENV) } catch (err) { lastErr = err }
      }
      throw new Error('未找到 python 可执行文件: ' + (lastErr && lastErr.message ? lastErr.message : 'python/python3/py 均不在 PATH'))
    }

    async function runPython(argv, cwd) {
      const pyPath = await resolvePython()
      const handle = subprocess.spawn({
        argv: [pyPath].concat(argv.slice(1)),
        cwd: cwd,
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: 512 * 1024, spill: { maxBytes: 4 * 1024 * 1024 } },
          stderr: { maxBytes: 512 * 1024, spill: { maxBytes: 4 * 1024 * 1024 } },
        },
        graceMs: 120000,
        env: PY_ENV,
      })
      try {
        const outcome = await handle.done
        const so = handle.collected.stdout
        const se = handle.collected.stderr
        return {
          exitCode: outcome.exitCode,
          signal: outcome.signal,
          stdout: so ? so.readFrom(0).text : '',
          stderr: se ? se.readFrom(0).text : '',
        }
      } catch (err) {
        throw new Error('Python 启动失败: ' + (err && err.message ? err.message : String(err)))
      }
    }

    async function writeTextFile(absPath, content) {
      if (fs === undefined) throw new Error('fs 服务不可用，无法写文件')
      const target = await fs.resolve(absPath)
      const policy = sandboxPolicy ? sandboxPolicy.resolve({}) : undefined
      await fs.writeText(target, content, undefined, undefined, policy)
    }

    async function readTextFile(absPath) {
      if (fs === undefined) throw new Error('fs 服务不可用，无法读文件')
      return await fs.readText(await fs.resolve(absPath))
    }

    let cachedOjgen = null
    async function getOjgenSource(base) {
      if (cachedOjgen !== null) return cachedOjgen
      if (fs !== undefined) {
        const candidates = []
        if (base && base !== '') candidates.push(base + '/ojgen-project/scripts/ojgen.py')
        if (workspaceRoot !== '') candidates.push(workspaceRoot + '/ojgen-project/scripts/ojgen.py')
        for (let k = 0; k < candidates.length; k++) {
          try {
            const src = await fs.readText(await fs.resolve(candidates[k]))
            if (typeof src === 'string' && src.indexOf('class Gen') >= 0) { cachedOjgen = src; return src }
          } catch (e) { /* 尝试下一个路径 */ }
        }
      }
      cachedOjgen = OJGEN_EMBEDDED
      return cachedOjgen
    }

    async function findManifestDir(root, depth) {
      let found = null
      async function walk(dir, d) {
        if (found !== null || d < 0 || fs === undefined) return
        let entries = []
        try { entries = await fs.listDir(await fs.resolve(dir)) } catch (e) { return }
        for (const e of entries) {
          if (found !== null) return
          if (e.name === 'manifest.json' && e.type === 'file') { found = dir; return }
          if (e.type === 'directory' && d > 0) await walk(dir + '/' + e.name, d - 1)
        }
      }
      await walk(root, depth)
      return found
    }

    async function generate(req, exec) {
      const out = { ok: false, outDir: '', files: [], log: '', error: '' }
      try {
        const platform = String(req && req.platform || '').toLowerCase()
        if (PLATFORMS.indexOf(platform) < 0) throw new Error('不支持的平台 "' + platform + '"，可选: ' + PLATFORMS.join(' / '))
        const pid = sanitizeSegment(String(req && req.problem_id || ''))
        if (pid === '') throw new Error('problem_id 不能为空')
        const n = Number(req && req.n_cases)
        if (!Number.isFinite(n) || n < 1 || n > 100000) throw new Error('n_cases 必须是 1..100000 的整数')
        const script = String(req && req.script || '')
        if (script.trim() === '') throw new Error('生成器脚本不能为空')
        const base = defaultBaseOf(exec)
        if (base === '') throw new Error('sandboxPolicy.workspaceRoot 不可用')
        const workdir = (req && req.out_dir) ? String(req.out_dir) : defaultOutDir(platform, pid, base)
        out.outDir = workdir

        const mk = await runPython(['python', '-c', 'import os,sys; os.makedirs(sys.argv[1], exist_ok=True)', workdir], base)
        if (mk.exitCode !== 0) throw new Error('创建输出目录失败: ' + ((mk.stderr || '') + (mk.stdout || '')).trim().slice(-2000))
        await writeTextFile(workdir + '/ojgen.py', await getOjgenSource(base))
        const scriptName = 'gen_' + pid + '.py'
        await writeTextFile(workdir + '/' + scriptName, script)
        const run = await runPython(['python', scriptName], workdir)
        const log = (run.stdout + (run.stderr !== '' ? '\n[stderr]\n' + run.stderr : '')).trim()
        out.log = log
        if (run.exitCode !== 0) throw new Error('生成器退出码 ' + run.exitCode + '（非 0 视为失败）\n' + log.slice(-6000))

        const manifestDir = await findManifestDir(workdir, 3)
        if (manifestDir !== null) {
          out.outDir = manifestDir
          try {
            const manifest = JSON.parse(await readTextFile(manifestDir + '/manifest.json'))
            if (Array.isArray(manifest.files)) out.files = manifest.files.map(function (f) { return String(f) })
          } catch (e) { /* 忽略 manifest 解析失败 */ }
        }
        out.ok = true
      } catch (err) {
        out.error = err && err.message ? err.message : String(err)
        if (out.log === '') out.log = out.error
      }
      return out
    }

    async function envCheck() {
      const out = { python: '', executable: '', cyaron: '', ok: false, error: '' }
      try {
        const base = defaultBaseOf(undefined)
        if (base === '') throw new Error('sandboxPolicy.workspaceRoot 不可用')
        const code = [
          "import sys, json",
          "info = {'version': sys.version.split()[0], 'exe': sys.executable}",
          "try:",
          "    import cyaron",
          "    info['cyaron'] = 'installed'",
          "except Exception as e:",
          "    info['cyaron'] = 'missing (' + type(e).__name__ + ')'",
          "print(json.dumps(info, ensure_ascii=False))",
        ].join('\n')
        const run = await runPython(['python', '-c', code], base)
        if (run.exitCode !== 0) { out.error = (run.stderr || run.stdout || 'python 启动失败').trim().slice(-1000); return out }
        const lines = run.stdout.split('\n').filter(function (l) { return l.trim() !== '' })
        const info = JSON.parse(lines[lines.length - 1] || '{}')
        out.python = String(info.version || '')
        out.executable = String(info.exe || '')
        out.cyaron = String(info.cyaron || 'unknown')
        out.ok = info.cyaron === 'installed'
      } catch (err) {
        out.error = err && err.message ? err.message : String(err)
      }
      return out
    }

    const disposers = []
    disposers.push(harness.handle('ojgen.env-check', async function () { return envCheck() }))
    disposers.push(harness.handle('ojgen.generate', async function (args) { return generate(args) }))
    disposers.push(harness.handle('ojgen.defaults', async function () { return { workspaceRoot: workspaceRoot, base: defaultBaseOf(undefined), platforms: PLATFORMS } }))

    const tool = harness.defineTool({
      name: 'generate_oj_data',
      description: '用 CYaRon 为多平台 OJ 生成练习题测试数据（洛谷 luogu / HDOJ hdu / POJ poj / ZOJ zoj / 牛客ACM nowcoder / 牛客核心代码 nowcoder_core / LeetCode leetcode）。调用方式：写好 Python 生成器脚本正文（from ojgen import Gen，构造 Gen(platform=..., problem_id=..., n=..., std=..., out_dir=..., seed=...) 后，在 for i in gen.cases(): 内用 gen.input_writeln/input_json 写输入、gen.output_writeln/output_json 或 gen.auto_output() 生成答案，最后 gen.pack()），把整段脚本传给 script 参数。插件会把 ojgen.py 与脚本写入输出目录并用本机 Python 运行，按平台打包数据：luogu 输出 <pid>-<i>.in/.out；hdu/poj/zoj/nowcoder 输出 <pid>.in/.out（EOF 多组拼接）+ cases/；leetcode/nowcoder_core 输出 testcases.txt + answers.txt。返回输出目录与文件清单。',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['luogu', 'hdu', 'poj', 'zoj', 'nowcoder', 'nowcoder_core', 'leetcode'], description: '目标 OJ 平台' },
          problem_id: { type: 'string', description: '题目编号，作为文件名前缀，如 P1001、1000、two-sum' },
          n_cases: { type: 'integer', description: '测试数据组数（>=1）' },
          script: { type: 'string', description: 'Python 生成器脚本完整正文（导入 ojgen，构造 Gen 并最终调用 gen.pack()）' },
          std: { type: 'string', description: '可选：标程命令（如 "python std.py" 或 "std.exe"），gen.auto_output() 时使用' },
          seed: { type: 'integer', description: '可选：随机种子，保证数据可复现' },
          out_dir: { type: 'string', description: '可选：输出目录绝对路径；默认 <工作区>/ojgen-project/generated/<platform>-<pid>' },
        },
        required: ['platform', 'problem_id', 'n_cases', 'script'],
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', required: true },
            outDir: { type: 'string', required: true },
            files: { type: 'array', items: { type: 'string' }, required: true },
            log: { type: 'string', required: true },
            error: { type: 'string', required: true },
          },
          additionalProperties: false,
        },
        render: function (args, value) {
          const lines = []
          if (value.ok) {
            lines.push('[OJ数据生成] 成功（平台 ' + String(args.platform) + '，题目 ' + String(args.problem_id) + '，' + String(args.n_cases) + ' 个用例）')
            lines.push('输出目录: ' + value.outDir)
            lines.push('文件: ' + (value.files.length ? value.files.join('、') : '（见 manifest.json）'))
          } else {
            lines.push('[OJ数据生成] 失败: ' + value.error)
          }
          if (value.log) lines.push('--- 生成器日志 ---\n' + String(value.log).slice(-4000))
          return [{ type: 'text', text: lines.join('\n') }]
        },
      },
      execute: async function (args, exec) { return generate(args, exec) },
      timeoutMs: 300000,
    })
    disposers.push(harness.registerTool(ctx, tool))

    ctx.effect(() => () => { disposers.forEach((d) => { try { d() } catch (e) {} }) })
  },
}
}
