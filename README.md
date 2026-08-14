# OJ 练习题多平台数据生成器（ojgen-project）

> 本人第一次使用deepseek harness把之前我做的一半的东西给做好了，可能还是会有不完善的地方，需要大家尽可能反馈问题

借助 Python + [CYaRon](https://github.com/luogu-dev/cyaron) 为多个 OJ 平台生成算法练习题的测试数据。

- 开源许可：[MIT](LICENSE)
- 发布脚本：`publish-to-github.ps1`（在本机执行，创建 GitHub 仓库并推送）

## 支持平台与输出格式

| 平台 | 生成器参数 | 交付格式 |
| --- | --- | --- |
| 洛谷 luogu.com.cn | `luogu` | 每测试点独立 `<pid>-1.in/.out` … `<pid>-n.in/.out`（SPJ 加 `checker.cpp`） |
| HDOJ / POJ / ZOJ | `hdu` / `poj` / `zoj` | `<pid>.in` / `<pid>.out`（全部用例 EOF 拼接）+ `cases/` 分用例 |
| 牛客（ACM 模式） | `nowcoder` | `<pid>.in` / `<pid>.out`（EOF 拼接）+ `cases/` |
| 牛客（核心代码模式） | `nowcoder_core` | `testcases.txt` + `answers.txt`（参数逐行 JSON 序列化） |
| LeetCode | `leetcode` | `testcases.txt` + `answers.txt`（参数逐行 JSON 序列化） |

暂时不支持交互题与通信题，不过应该会变得更快吧

## 目录结构

```
ojgen-project/
├── README.md                     本文件
├── skill/                        OJ 数据生成 skill 包（供 AI 助手按流程使用）
│   ├── SKILL.md                  完整工作流程（平台要点、SPJ、交付终检）
│   └── references/
│       ├── platform-formats.md   各平台判题约定、组帧方式、LeetCode 序列化规则
│       ├── data-quality.md       造数据细节：覆盖清单、validator、对拍、常见坑
│       ├── cyaron-api.md         CYaRon API 速查
│       └── luogu-spj.md          洛谷 Special Judge 指南
├── scripts/
│   ├── ojgen.py                  ★ 多平台生成核心框架（Gen 类，唯一必需依赖）
│   ├── generator_template.py     生成器模板
│   └── examples/
│       ├── example_stdin_eof.py  HDOJ/POJ/ZOJ/牛客 ACM（EOF 多组）
│       ├── example_leetcode.py   LeetCode / 牛客核心代码
│       └── example_luogu.py      洛谷（子任务风格）
├── generated/                    示例测试数据（hdu-1000、zoj-1001、leetcode-two-sum）
├── plugin/                       DeepSeek Harness 动态插件源码（GUI 面板 + 模型工具）
│   ├── README.md                 重新安装/定义说明
│   ├── host.js                   Host 半区（generate_oj_data 工具、生成服务）
│   └── client.js                 Client 半区（设置 → OJ 数据生成面板）
├── docs/cyaron-wiki/             CYaRon 上游参考文档（中文）
└── dist/oj-problem-generator-skill.zip   可安装的 skill 打包
```

## 快速开始

### 1. 环境

```bash
pip install cyaron      # Python >= 3.8；大数据建议 PyPy
```

### 2. 编写生成器

把 `scripts/ojgen.py` 复制到工作目录（或直接在该目录运行），新建 `gen_xxx.py`：

```python
from ojgen import Gen, randint

gen = Gen(platform="hdu", problem_id="1000", n=10,
          std=None, out_dir="data/hdu1000", seed=20260815)
for i in gen.cases():                       # i = 1..n
    a, b = randint(1, 10**9), randint(1, 10**9)
    gen.input_writeln(a, b)                 # 写第 i 个用例输入
    gen.output_writeln(a + b)               # 手动写答案（多行用 output_raw）
# gen.auto_output("python std.py")          # 或用标程逐用例生成答案
gen.pack()                                  # 按平台打包
```

```bash
python gen_xxx.py
```

输出目录内附 `manifest.json`（平台/题号/种子/时间）与 `README.txt`（格式说明）。

### 3. 核心 API

| 方法 | 作用 |
| --- | --- |
| `Gen(platform, problem_id, n, std, out_dir, seed)` | 初始化生成任务（自动 seed 随机） |
| `gen.cases()` | 迭代 1..n，进入/离开用例时自动落盘 |
| `gen.input_writeln(*args)` / `gen.input_write(*args)` | 写输入行（等价 cyaron IO） |
| `gen.input_json(obj)` | 序列化平台：按 LeetCode 规则写一个 JSON 值 |
| `gen.input_raw(text)` | 原样写入多行（如 `graph.to_str()`） |
| `gen.output_writeln(*args)` / `gen.output_raw(text)` | 手动写答案 |
| `gen.output_json(obj)` | 手动写答案（序列化平台） |
| `gen.auto_output(std?)` | 逐用例用标程生成答案（无手动答案的用例） |
| `gen.pack()` | 按平台打包并写 manifest/README，强制 LF 换行 |

### 4. 在 DeepSeek Harness 中使用（插件）

- **GUI**：打开 设置 → OJ 数据生成 面板，填平台/题号/组数/种子/标程，编辑脚本，一键“生成数据”。
- **模型工具**：让 AI 直接调用 `generate_oj_data`（参数 `platform / problem_id / n_cases / script / std / seed / out_dir`）。
- 插件默认输出到 `<工作区>/ojgen-project/generated/<平台>-<题号>/`；插件源码见 `plugin/`（会话级动态插件，进程重启后按 `plugin/README.md` 重新定义）。

## 造数据要点（详见 skill/references/data-quality.md）

- 样例数据必须与题面逐字节一致；样例输出为多行时，数据必须含多行输出的用例；
- 覆盖最小/最大规模、边界值、构造特殊数据（链/菊花/完全图/全相等/逆序）、卡常数据；
- 数据必须满足题面全部约束（写 validator 校验）；
- 答案优先用标程生成，标程先过样例再跑全量；
- seed 固定可复现；全部文件 LF 换行、UTF-8、无尾随空格、末尾换行。
