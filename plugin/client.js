// OJ 练习题数据生成器 —— DSH 动态 Cordis 插件 · Client 半区
// 来源：ojgen-1/pkg-5（当前运行版本，DSH 动态插件）
// 说明：本文件是 cordis_define 的 code.client 函数体（return { apply(ctx) {...} }），
// 配合同目录 host.js 作为 code.host 重新定义后，经 cordis_run 激活。
// 效果：在「设置 → OJ 数据生成」注册面板（settings.section，id=oj-data-generator），
// 通过 host.call('ojgen.env-check' | 'ojgen.generate' | 'ojgen.defaults') 与 Host 半区通信。
"use strict";
module.exports = function () {
return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const DEFAULT_SCRIPT = [
      '# HDU 1000 示例：每组一行两个整数 a b，输出 a+b（EOF 多组）',
      'from ojgen import Gen, randint',
      '',
      'gen = Gen(platform="hdu", problem_id="1000", n=10,',
      '          out_dir=".", seed=20260815)',
      'for i in gen.cases():',
      '    if i == 1:',
      '        a, b = 1, 2                    # 样例数据',
      '    elif i == 2:',
      '        a, b = 10**9, 10**9            # 最大边界',
      '    else:',
      '        a, b = randint(0, 10**9), randint(0, 10**9)',
      '    gen.input_writeln(a, b)',
      '    gen.output_writeln(a + b)          # 或改用 gen.auto_output("python std.py")',
      'gen.pack()',
      '',
    ].join('\n')

    const PLATFORM_OPTIONS = [
      { v: 'luogu', t: '洛谷（luogu）· <pid>-<i>.in/.out' },
      { v: 'hdu', t: 'HDOJ（hdu）· <pid>.in/.out EOF 拼接' },
      { v: 'poj', t: 'POJ（poj）· <pid>.in/.out EOF 拼接' },
      { v: 'zoj', t: 'ZOJ（zoj）· <pid>.in/.out EOF 拼接' },
      { v: 'nowcoder', t: '牛客 ACM（nowcoder）· <pid>.in/.out' },
      { v: 'nowcoder_core', t: '牛客核心代码（nowcoder_core）· testcases+answers' },
      { v: 'leetcode', t: 'LeetCode（leetcode）· testcases+answers' },
    ]

    const CSS = [
      '.ojgen-panel { display:flex; flex-direction:column; gap:12px; padding:4px 0 24px; max-width:820px; color:var(--dsw-alias-label-primary); font-size:13px; }',
      '.ojgen-panel h2 { margin:0; font-size:17px; }',
      '.ojgen-sub { color:var(--dsw-alias-label-secondary); font-size:12px; margin:0; }',
      '.ojgen-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }',
      '.ojgen-field { display:flex; flex-direction:column; gap:4px; min-width:0; }',
      '.ojgen-field label { font-size:11px; color:var(--dsw-alias-label-secondary); }',
      '.ojgen-field input, .ojgen-field select, .ojgen-panel textarea { box-sizing:border-box; width:100%; padding:6px 8px; font-size:12px; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:6px; font-family:inherit; }',
      '.ojgen-panel textarea { font-family:ui-monospace,Consolas,"Courier New",monospace; resize:vertical; min-height:220px; white-space:pre; }',
      '.ojgen-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }',
      '.ojgen-btn { padding:6px 14px; font-size:12px; border-radius:6px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-brand-primary); color:#fff; cursor:pointer; }',
      '.ojgen-btn:disabled { opacity:.55; cursor:default; }',
      '.ojgen-pre { background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:6px; padding:8px 10px; font-size:11px; overflow:auto; max-height:240px; white-space:pre-wrap; word-break:break-all; font-family:ui-monospace,Consolas,monospace; margin:6px 0 0; }',
      '.ojgen-ok { color:var(--dsw-alias-state-success-primary); }',
      '.ojgen-err { color:var(--dsw-alias-state-error-primary); }',
      '.ojgen-warn { color:var(--dsw-alias-state-warn-primary); }',
      '.ojgen-table { border-collapse:collapse; font-size:11px; width:100%; }',
      '.ojgen-table td, .ojgen-table th { border:1px solid var(--dsw-alias-border-l1); padding:4px 8px; text-align:left; }',
      '.ojgen-table th { color:var(--dsw-alias-label-secondary); font-weight:600; }',
    ].join('\n')

    function el(type, props) {
      const args = [type, props]
      for (let i = 2; i < arguments.length; i++) args.push(arguments[i])
      return React.createElement.apply(React, args)
    }

    function OJPanel() {
      const [env, setEnv] = React.useState(null)
      const [checking, setChecking] = React.useState(false)
      const [platform, setPlatform] = React.useState('hdu')
      const [problemId, setProblemId] = React.useState('1000')
      const [nCases, setNCases] = React.useState('10')
      const [seed, setSeed] = React.useState('20260815')
      const [std, setStd] = React.useState('')
      const [outDir, setOutDir] = React.useState('')
      const [script, setScript] = React.useState(DEFAULT_SCRIPT)
      const [busy, setBusy] = React.useState(false)
      const [result, setResult] = React.useState(null)
      const [defaults, setDefaults] = React.useState(null)

      React.useEffect(function () {
        let alive = true
        host.call('ojgen.defaults').then(function (d) { if (alive) setDefaults(d) }).catch(function () {})
        return function () { alive = false }
      }, [])

      const checkEnv = async function () {
        setChecking(true)
        try { setEnv(await host.call('ojgen.env-check')) } finally { setChecking(false) }
      }

      const doGenerate = async function () {
        setBusy(true)
        setResult(null)
        try {
          const r = await host.call('ojgen.generate', {
            platform: platform,
            problem_id: problemId,
            n_cases: Number(nCases),
            seed: seed.trim() === '' ? undefined : Number(seed),
            std: std.trim() === '' ? undefined : std,
            out_dir: outDir.trim() === '' ? undefined : outDir,
            script: script,
          })
          setResult(r)
        } catch (e) {
          setResult({ ok: false, outDir: '', files: [], log: '', error: String(e && e.message ? e.message : e) })
        } finally {
          setBusy(false)
        }
      }

      const envNode = env === null
        ? el('span', { className: 'ojgen-sub' }, '未检查')
        : env.ok
          ? el('span', { className: 'ojgen-ok' }, 'Python ' + env.python + ' · CYaRon 已安装 · ' + env.executable)
          : el('span', { className: 'ojgen-err' }, '环境不可用：' + (env.error || env.cyaron))

      const defaultHint = defaults && defaults.base
        ? '留空输出到 ' + defaults.base + '/ojgen-project/generated/<平台>-<题号>'
        : '留空使用默认输出目录'

      const resultNode = result === null ? null : result.ok
        ? el('div', null,
            el('div', { className: 'ojgen-ok' }, '生成成功：' + result.outDir),
            el('pre', { className: 'ojgen-pre' },
              '文件（' + (result.files ? result.files.length : 0) + ' 个）：\n' +
              (result.files && result.files.length ? result.files.join('\n') : '(见 manifest.json)') +
              (result.log ? '\n\n--- 日志 ---\n' + result.log : '')))
        : el('div', null,
            el('div', { className: 'ojgen-err' }, '生成失败：' + result.error),
            result.log ? el('pre', { className: 'ojgen-pre' }, result.log) : null)

      return el('div', { className: 'ojgen-panel' },
        el('h2', null, 'OJ 练习题数据生成器'),
        el('p', { className: 'ojgen-sub' }, '基于 CYaRon，支持洛谷 / HDOJ / POJ / ZOJ / 牛客 / LeetCode。生成器脚本语法见项目 skill/（scripts/ojgen.py），也可让对话中的智能体直接调用 generate_oj_data 工具。'),
        el('div', { className: 'ojgen-row' },
          el('button', { className: 'ojgen-btn', onClick: checkEnv, disabled: checking }, checking ? '检查中…' : '检查 Python/CYaRon 环境'),
          envNode),
        el('div', { className: 'ojgen-grid' },
          el('div', { className: 'ojgen-field' },
            el('label', null, '平台'),
            el('select', { value: platform, onChange: function (e) { setPlatform(e.target.value) } },
              PLATFORM_OPTIONS.map(function (o) {
                return el('option', { key: o.v, value: o.v }, o.t)
              }))),
          el('div', { className: 'ojgen-field' },
            el('label', null, '题目编号'),
            el('input', { value: problemId, onChange: function (e) { setProblemId(e.target.value) } })),
          el('div', { className: 'ojgen-field' },
            el('label', null, '用例数'),
            el('input', { type: 'number', min: '1', value: nCases, onChange: function (e) { setNCases(e.target.value) } })),
          el('div', { className: 'ojgen-field' },
            el('label', null, '随机种子（可复现）'),
            el('input', { value: seed, onChange: function (e) { setSeed(e.target.value) } })),
          el('div', { className: 'ojgen-field' },
            el('label', null, '标程命令（auto_output 用，可选）'),
            el('input', { value: std, placeholder: 'python std.py / std.exe', onChange: function (e) { setStd(e.target.value) } })),
          el('div', { className: 'ojgen-field' },
            el('label', null, '输出目录（绝对路径，可选）'),
            el('input', { value: outDir, placeholder: defaultHint, onChange: function (e) { setOutDir(e.target.value) } }))),
        el('div', { className: 'ojgen-field' },
          el('label', null, '生成器脚本（Python；需 from ojgen import Gen 并调用 gen.pack()）'),
          el('textarea', { value: script, spellCheck: false, onChange: function (e) { setScript(e.target.value) } })),
        el('div', { className: 'ojgen-row' },
          el('button', { className: 'ojgen-btn', onClick: doGenerate, disabled: busy }, busy ? '生成中…' : '生成数据'),
          busy ? el('span', { className: 'ojgen-sub' }, '正在运行生成器，大数据请稍候') : null),
        resultNode,
        el('table', { className: 'ojgen-table' },
          el('thead', null,
            el('tr', null, el('th', null, '平台'), el('th', null, '输出格式'))),
          el('tbody', null,
            el('tr', null, el('td', null, 'luogu'), el('td', null, 'P1001-1.in/.out … 每测试点独立')),
            el('tr', null, el('td', null, 'hdu / poj / zoj / nowcoder'), el('td', null, '1000.in / 1000.out（EOF 多组拼接）+ cases/')),
            el('tr', null, el('td', null, 'leetcode / nowcoder_core'), el('td', null, 'testcases.txt + answers.txt（参数逐行 JSON）'))))
      )
    }

    ctx.effect(function () {
      const disposers = []
      try { disposers.push(styles.insert(CSS)) } catch (e) { console.error('ojgen styles failed', e) }
      try {
        const stop = slots.inject('settings.section', function () {
          try {
            const d = slots.register(
              { name: 'settings.section', id: 'oj-data-generator', order: 30, label: 'OJ 数据生成' },
              function () { return React.createElement(OJPanel, null) },
            )
            if (d) disposers.push(d)
          } catch (e) { console.error('ojgen slot register failed', e) }
        })
        if (stop) disposers.push(stop)
      } catch (e) { console.error('ojgen slot inject failed', e) }
      return function () { disposers.forEach(function (d) { try { d() } catch (e) {} }) }
    })
  },
}
}
