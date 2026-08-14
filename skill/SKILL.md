---
name: oj-problem-generator
description: 当用户要求生成 OJ 练习题测试数据、编写 CYaRon 数据生成器、生成 special judge 的 checker.cpp 或按平台打包题目数据时触发。支持洛谷、HDOJ、POJ、ZOJ、牛客（ACM/核心代码）、LeetCode 等平台的数据生成；支持普通判题与 special judge；不支持交互题和通信题。
agent_created: true
---

# OJ 题目数据生成器（多平台）

## 概述

使用 Python 与 CYaRon 库生成多平台算法练习题的测试数据。核心是 `scripts/ojgen.py` 框架：一份生成逻辑，按平台自动打包成对应格式：

| 平台参数 | 交付文件 |
| --- | --- |
| `luogu` | `<pid>-1.in/.out` ... `<pid>-n.in/.out`（每测试点独立；SPJ 加 `checker.cpp`） |
| `hdu` / `poj` / `zoj` / `nowcoder` | `<pid>.in` / `<pid>.out`（全部用例 EOF 拼接单流）+ `cases/` 分用例 |
| `leetcode` / `nowcoder_core` | `testcases.txt` + `answers.txt`（参数按行 JSON 序列化） |

各平台判题约定与数据格式详见 `references/platform-formats.md`；造数据细节与质量清单见 `references/data-quality.md`。

## 触发条件

在以下场景中使用本 skill：

- 生成 OJ / 练习题测试数据（洛谷、HDOJ、POJ、ZOJ、牛客、LeetCode 等）
- 编写 CYaRon 数据生成器
- 创建 special judge 的 `checker.cpp`
- 按平台打包题目数据

若用户提到交互题或通信题（含 LeetCode 交互题），直接拒绝并说明本 skill 不支持。

## 环境准备

```bash
pip install cyaron      # Python >= 3.8；大量数据建议用 PyPy 运行
```

Windows / Linux / macOS 通用。执行脚本时注意命令名差异：Linux/macOS 常用 `python3`，Windows 常用 `python`/`py`（标程命令同理，如 `gen.auto_output("python3 std.py")`）。

若无法使用 pip，可下载源码压缩包（<https://github.com/luogu-dev/cyaron/archive/master.zip>），解压后在根目录编写生成器脚本。

标程（参考解答）是可选但强烈推荐：普通判题用 `gen.auto_output("python std.py")` 生成 `.out`，比手写答案可靠。

## 需要确认的信息

生成数据前，若用户未提供，请逐项确认：

1. **目标平台**：luogu / hdu / poj / zoj / nowcoder / nowcoder_core / leetcode。
2. **题目编号**：如 `P1001`、`1000`（HDU/POJ/ZOJ 题号）、`two-sum`。
3. **题目内容**：题意、输入格式、输出格式、约束条件。
4. **组帧方式**（stdin/stdout 平台）：EOF 多组 / 首行 T / 哨兵终止 / 单组。默认按 EOF 多组拼接，其余方式在生成器中手动加框架行。
5. **题目类型**：普通判题或 special judge（答案不唯一/浮点误差时用 SPJ）。
6. **标程路径或源码**：生成 `.out` 用；SPJ 可选。
7. **数据组数 n** 与 **数据范围**：每个变量的取值范围、规模、子任务划分。
8. **特殊情形**：边界数据、构造数据、卡常数据、特定分布。

## 通用工作流程

> **在本工作台（DeepSeek Harness）中**：可直接调用模型工具 `generate_oj_data`（参数 platform / problem_id / n_cases / script / std / seed / out_dir）执行生成，或在“设置 → OJ 数据生成”面板中运行；生成器脚本本身与下述流程完全一致，`ojgen.py` 会由插件自动写入工作目录。

1. 必要时读取 `references/platform-formats.md`、`references/data-quality.md`、`references/cyaron-api.md`。
2. 把 `scripts/ojgen.py` 复制到工作目录，编写生成器脚本（模板见 `scripts/generator_template.py`，示例见 `scripts/examples/`）。
3. `for i in gen.cases():` 内构造用例输入；答案二选一：
   - 手动写：`gen.output_writeln(...)` / `gen.output_json(...)`（适合简单题）；
   - 标程生成：循环外 `gen.auto_output("python std.py")`。
4. `gen.pack()` 按平台打包。
5. 按 `references/data-quality.md` 第 8 节做交付前终检（样例一致、约束校验、LF、无尾随空格、答案正确）。

最小示例（HDU A+B，EOF 多组）：

```python
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ojgen import Gen, randint

gen = Gen(platform="hdu", problem_id="1000", n=10,
          std="python std.py", out_dir="data/hdu1000", seed=20260815)
for i in gen.cases():
    a, b = randint(1, 10**9), randint(1, 10**9)
    gen.input_writeln(a, b)
gen.auto_output()
gen.pack()
```

## 平台要点

### 洛谷（luogu）

- 每测试点独立文件 `<pid>-<i>.in/.out`；全部文件（SPJ 再加 `checker.cpp`）打成一个 zip 上传。
- 子任务：按用例编号分段控制范围（示例见 `scripts/examples/example_luogu.py`），上传后可在 `config.yml` 里声明子任务与时空限制（见 `platform-formats.md`）。
- Special Judge 流程见下方章节与 `references/luogu-spj.md`。

### HDOJ / POJ / ZOJ / 牛客 ACM（stdin/stdout）

- 数据是"所有用例拼接成的单一输入流"，判题靠重定向：`std.exe < 1000.in > my.out`。
- 主流是 EOF 多组（`while (cin >> n)`），部分题首行 T 或哨兵终止——**以题面为准**，框架只拼接用例，T/哨兵行由生成器自行写出。
- POJ 老题输出格式敏感：标程输出必须与样例逐字符一致（无尾随空格、无多余空行）。
- 交付同时保留 `cases/` 分用例文件，便于逐用例对拍。

### 牛客核心代码 / LeetCode（核心代码模式）

- 数据是序列化参数文件：`testcases.txt` 每行一个 JSON 值，每个用例占 k 行（k = 参数个数）；`answers.txt` 每行一个答案。
- 必须用 `gen.input_json()` / `gen.output_json()`（框架已用紧凑 `json.dumps`），**严禁 `repr`/`str`**。
- 答案可用 Python 直接算，或写 runner 包装 `Solution` 再 `gen.auto_output("python runner.py")`（runner 模板见 `platform-formats.md`）。
- 数组/链表/树等类型序列化规则见 `platform-formats.md` 类型表。

## Special Judge 题目

1. 像普通题目一样生成 `.in`（平台不限，洛谷最常见）。
2. 若存在标程，生成 `.out` 作参考；否则 `.out` 可省略或仅放样例。
3. 编写 `checker.cpp`（Testlib），与数据文件放同一目录；本地编译：
   ```bash
   g++ -fno-asm -std=c++14 -O2 checker.cpp -o checker.exe
   ```
4. `checker.cpp` 必须以 `quitf()` / `quitp()` 结束；本地逐用例验证：
   `checker.exe in.txt out.txt ans.txt`。
5. 上传洛谷时务必添加“Special Judge”标签。

最小 `checker.cpp` 与完整指南见 `references/luogu-spj.md`。

## 造数据细节（必读）

完整清单在 `references/data-quality.md`，核心纪律：

- **样例必须逐字节复刻**题面样例；
- **多行输出硬性规则**：题面样例输出为多行时，数据必须包含输出为多行的用例，禁止全部单行（历史事故教训）；
- 覆盖最小/最大规模、边界值、构造特殊数据（链/菊花/完全图/全相等/逆序）、卡常数据；
- 数据必须满足题面全部约束，图类题用并查集等校验（validator）；
- 标程先过样例再跑全量；浮点按精度格式化，避免 `-0.0` 与科学计数法；
- seed 固定可复现，记录在 `manifest.json`；
- 所有文件 LF 换行、UTF-8 编码、末尾换行、无尾随空格（框架已强制 LF，自写 open 时加 `newline="\n"`）。

## 文件命名与输出结构

`gen.pack()` 输出统一结构（以 hdu 为例）：

```
data/hdu1000/
  1000.in           # 全部用例 EOF 拼接
  1000.out
  cases/1.in ...    # 逐用例文件（对拍用）
  manifest.json     # 平台/题号/用例数/seed/时间
  README.txt        # 平台格式说明
```

LeetCode/牛客核心代码输出 `testcases.txt` + `answers.txt`；洛谷输出 `<pid>-<i>.in/.out` 平铺。

## 不支持的题目类型

- 交互题
- 通信题

若用户请求以上类型，回复：“本 skill 不支持交互题和通信题，请寻找其他工作流程处理这类题目。”

## 参考资料

- `references/platform-formats.md`：各平台判题约定与数据格式、组帧方式、LeetCode 序列化规则。
- `references/data-quality.md`：造数据细节、覆盖清单、validator、对拍、常见坑。
- `references/cyaron-api.md`：CYaRon API 完整速查。
- `references/luogu-spj.md`：洛谷 Special Judge 教程摘要。
- `scripts/ojgen.py`：多平台生成框架（生成脚本依赖它）。
- `scripts/generator_template.py`：生成器模板。
- `scripts/examples/`：hdu EOF 多组 / LeetCode / 洛谷子任务 三个完整示例。
