# 多平台 OJ 数据格式参考

本 skill 支持以下平台的练习题测试数据生成。各平台判题方式不同，交付的数据文件组织方式也不同。

## 平台总览

| 平台 | 判题模式 | 数据组织 | 交付文件（本框架默认） |
| --- | --- | --- | --- |
| 洛谷 luogu | 文件判题（每测试点一个 `.in`） | 每测试点独立文件 | `<pid>-1.in/.out` ... `<pid>-n.in/.out`（SPJ 加 `checker.cpp`） |
| HDOJ hdu | stdin/stdout | 所有用例拼接为一个输入流 | `<pid>.in` / `<pid>.out`（另存 `cases/` 分用例文件） |
| POJ poj | stdin/stdout | 同上（单组题只有 1 个用例） | `<pid>.in` / `<pid>.out`（另存 `cases/`） |
| ZOJ zoj | stdin/stdout | 同上 | `<pid>.in` / `<pid>.out`（另存 `cases/`） |
| 牛客 nowcoder | ACM 模式 = stdin/stdout；核心代码模式 = 序列化参数 | ACM：拼接单流；核心代码：同 LeetCode | ACM：`<pid>.in/.out`；核心代码：`testcases.txt` + `answers.txt` |
| LeetCode leetcode | 核心代码模式（类/函数签名） | 每参数一个 JSON 值，按行序列化 | `testcases.txt` + `answers.txt` |

生成脚本平台参数：`luogu`、`hdu`、`poj`、`zoj`、`nowcoder`（ACM 模式）、`nowcoder_core`（核心代码模式）、`leetcode`。

## 用例组帧（framing）约定

stdin/stdout 类平台（HDOJ/POJ/ZOJ/牛客 ACM）中，题目如何组织多组数据完全由题面决定，常见四种组帧方式：

### 1. EOF 多组（HDOJ/ZOJ/牛客主流）

题面特征："输入包含多组测试数据，处理到文件结束（EOF）"。
用例首尾相接，无 T 无哨兵，C/C++ 用 `while (cin >> n)` / `while (scanf(...) != EOF)`。

```
1 2        ← 用例 1
3 4        ← 用例 2
```

对应输出（与输入严格同序）：

```
3
7
```

### 2. 首行 T

题面特征："第一行一个整数 T，表示数据组数"。

```
2          ← T = 2
1 2
3 4
```

### 3. 哨兵终止

题面特征："输入以 0 0 结束"（哨兵不参与计算）。

```
1 2
0 0        ← 哨兵，无对应输出
```

### 4. 单组数据（POJ 老题常见）

整份输入只有一组，无框架。

> 框架拼接的是 EOF 模式；若题目是 T 开头或哨兵终止，在生成器里手动写首行 T / 末尾哨兵，再拼接用例。

## 洛谷（luogu.com.cn）

- 每个测试点一个 `.in` 文件，与 `.out` 一一对应；惯例命名 `<pid>-<i>.in/.out`（如 `P1001-1.in`）。
- 打包：将所有 `*.in/*.out`（及 SPJ 的 `checker.cpp`）放入同一 zip 上传。
- Special Judge：上传时勾选 "Special Judge" 标签；checker 用 Testlib 编写（见 `luogu-spj.md`）。
- 新题目配置 `config.yml`（子任务、时空限制）示例，字段以洛谷帮助中心为准：

```yaml
time: 1s
memory: 128m
subtasks:
  - score: 30
    cases: [1, 2, 3]
  - score: 70
    cases: [4, 5, 6, 7, 8, 9, 10]
```

- 洛谷支持交互题，但**本 skill 不支持**（见 SKILL.md）。

## HDOJ（acm.hdu.edu.cn）

- 输入从 stdin 读，输出写 stdout；本地判题用重定向：`std.exe < 1000.in > my.out`。
- 绝大多数题为 EOF 多组；少数题首行 T 或哨兵（如 `n == 0` 结束），以题面为准。
- 交付合并文件 `1000.in` / `1000.out`（如题号 1000），分用例文件放 `cases/` 便于对拍。
- 注意 HDOJ 判题机为 Linux：数据文件统一 LF 换行（本框架已强制）。

## POJ（poj.org）

- stdin/stdout；老题以单组数据为主，也有 EOF 多组与哨兵题。
- 部分老题对输出格式极敏感：行末空格、多余空行都可能 WA。标程输出要逐字符对齐题面样例。
- 交付 `1000.in` / `1000.out`（如题号 1000）+ `cases/`。

## ZOJ（zoj.pintia.cn / acm.zju.edu.cn）

- stdin/stdout；EOF 多组为主，个别题首行 T。
- 交付 `1001.in` / `1001.out`（如题号 1001）+ `cases/`。

## 牛客（nowcoder.com）

两种模式并存：

### ACM 模式

- 与 HDOJ 相同：stdin/stdout、EOF 多组为主。
- 交付 `<pid>.in` / `<pid>.out` + `cases/`。本地用牛客在线自测或重定向对拍。

### 核心代码模式

- 只写 `class Solution` 函数体（或指定函数签名），评测时参数由序列化用例传入。
- 数据格式与 LeetCode 完全一致：`testcases.txt` + `answers.txt`。
- 生成器平台参数用 `nowcoder_core`。

## LeetCode（leetcode.com / leetcode.cn）

核心代码模式，测试数据为**按行 JSON 序列化**：

- `testcases.txt`：每个测试用例占 k 行（k = 题目参数个数），每行是该参数 JSON 序列化后的值；用例间直接相连，无空行。
- `answers.txt`：每行一个 JSON 值，与 `testcases.txt` 中用例一一对应、同序。

以「两数之和」（参数：`nums`、`target`；答案：两个下标）为例：

`testcases.txt`：

```
[2,7,11,15]
9
[3,2,4]
6
```

`answers.txt`：

```
[0,1]
[1,2]
```

### 类型序列化规则

| C++/题面类型 | 序列化表示 |
| --- | --- |
| int / long | `123`、`-45` |
| double / float | `3.14`（标准 JSON，避免科学计数法与 `-0.0`） |
| bool | `true` / `false` |
| string | `"abc"`（必须带双引号；空串为 `""`） |
| char | `"a"` |
| vector / 数组 | `[1,2,3]` |
| ListNode（链表） | 从头结点起的数组 `[1,2,3]`，空链表 `[]` |
| TreeNode（二叉树） | 层序数组 `[3,9,20,null,null,15,7]`，空结点 `null`，空树 `[]` |
| 空指针 / None | `null` |

- 必须用 `json.dumps(..., separators=(",", ":"))` 序列化；**禁止用 Python `repr`/`str`**（单引号、`None`、`True` 都不是合法 JSON）。
- 本框架的 `input_json()` / `output_json()` 已按此规则实现。

### 本地运行方式

核心代码模式无法直接通过 stdin/stdout 判题。本地验证两种方式：

1. 生成器内直接算出答案（`output_json(...)`），数据即含答案；
2. 写一个 runner 包装 `Solution`，把序列化参数反序列化后调用并 `json.dumps` 输出，然后 `gen.auto_output("python runner.py")` 逐用例运行。

runner 模板（两数之和，Python）：

```python
import sys, json
from solution import Solution  # 你的题解文件

lines = sys.stdin.read().splitlines()
nums = json.loads(lines[0])   # 第 1 个参数
target = json.loads(lines[1]) # 第 2 个参数
ans = Solution().twoSum(nums, target)
print(json.dumps(ans, separators=(",", ":")))
```

## 输出规范化（所有平台通用）

- 换行统一 LF（`\n`），本框架在打包时强制转换。
- 每个用例文件末尾保留一个换行；拼接文件中用例间不留空行（EOF 模式）。
- 标程输出不得有行末多余空格（部分平台严格逐字节比对）。
- 浮点按题面保留位数输出（如 `print(f"{x:.6f}")`），避免 `-0.0` 与科学计数法。
- 标程命令按平台书写：Windows `python std.py` / `std.exe`，Linux/macOS `python3 std.py` / `./std`（框架按平台自动适配，见 SKILL.md 环境准备）。
- 更多细节见 `data-quality.md`。
