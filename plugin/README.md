# DSH 动态插件：OJ 练习题数据生成器

本目录是该项目的 DeepSeek Harness（DSH）动态 Cordis 插件源码，当前运行实例为 `ojgen-1/pkg-5`。

## 组成

| 文件 | 内容 |
| --- | --- |
| `host.js` | Host 半区（`cordis_define` 的 `code.host` 函数体） |
| `client.js` | Client 半区（`cordis_define` 的 `code.client` 函数体） |

## 功能

- **Host**：
  - 模型工具 `generate_oj_data`（平台/题号/组数/脚本/标程/种子/输出目录 → 执行并返回文件清单与日志）；
  - Package 私有 RPC：`ojgen.env-check`（Python/CYaRon 环境检查）、`ojgen.generate`（生成服务）、`ojgen.defaults`（默认路径与平台列表）；
  - 通过 `ctx.get('fs')` 写脚本、`ctx.get('subprocess')` 运行 Python，`sandboxPolicy` 提供路径基准；
  - 生成器核心 `ojgen.py` 优先读取 `<工作区>/ojgen-project/scripts/ojgen.py`，缺失时使用内置副本。
- **Client**：在「设置 → OJ 数据生成」（`settings.section`，id `oj-data-generator`）注册面板：平台选择、题目编号、用例数、种子、标程、输出目录、脚本编辑、环境检查、结果与日志展示。

## 默认输出目录

`<会话 cwd（优先，回退 workspaceRoot）>/ojgen-project/generated/<平台>-<题号>/`

## 重新安装（DSH 进程重启后插件会失效）

1. 在 DSH 会话中让 AI 执行：以本目录 `host.js` 的 `module.exports` 函数体作为 `code.host`、`client.js` 的函数体作为 `code.client` 调用 `cordis_define`（`kind:"new"`，`idPrefix` 任取，如 `ojgen`）；
2. 调用 `cordis_run` 激活（可能需要用户在界面批准）；
3. 刷新页面后打开「设置 → OJ 数据生成」。

## 版本历史（ojgen-1）

- `pkg-1`：初版（parameters 根级 `additionalProperties:false` 被 DSH 校验拒绝）；
- `pkg-2`：修复 parameters（隐式参数根必须开放）；
- `pkg-3`：修复 output.schema（ValueSchemaSpec DSL：逐属性 `required:true`）；
- `pkg-4`：默认目录优先会话 cwd（`Session.header.cwd`）；
- `pkg-5`：路径对齐 `ojgen-project` 布局（当前）。

## 开发注意（DSH 动态插件约束）

- 代码必须是纯 JavaScript（无 import/require/TS/JSX），Client 用 `React.createElement`；
- 工具注册必须使用 `harness.defineTool` 返回的定义 + `harness.registerTool(ctx, tool)`；
- `parameters` 是"隐式开放的参数根"：根级不允许 `additionalProperties:false`；
- `output.schema` 是 ValueSchemaSpec DSL：根级不允许 `required` 数组，逐属性用 `required:true`，对象必须显式 `additionalProperties`；
- 生命周期副作用全部挂在 `ctx.effect`/disposer 上，stop/update 自动回收。
