#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""CYaRon 多平台数据生成器模板（基于 scripts/ojgen.py 框架）。

用法：
    python generator_template.py

按题目调整下方"题目配置"与"生成逻辑"。平台可选：
    luogu | hdu | poj | zoj | nowcoder | nowcoder_core | leetcode
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ojgen import Gen, randint  # noqa: E402

# ---------- 题目配置 ----------
PLATFORM = "luogu"      # 目标平台
PROBLEM_ID = "P1001"    # 题目编号
N = 10                  # 用例数
OUT_DIR = "data"        # 输出目录
SEED = 20260815          # 随机种子（可复现）
STD = None              # 标程命令，如 "python std.py" / "std.exe"

# 数据范围配置（按题面约束）
N_MIN, N_MAX = 1, 1000
A_MIN, A_MAX = 1, 100000

# ---------- 生成逻辑 ----------
gen = Gen(platform=PLATFORM, problem_id=PROBLEM_ID, n=N,
          std=STD, out_dir=OUT_DIR, seed=SEED)

for i in gen.cases():
    # 示例题目：输出 n，随后 n 行每行两个整数 a b（A+B 练习）
    n = randint(N_MIN, N_MAX)
    gen.input_writeln(n)
    ans_lines = []
    for _ in range(n):
        a = randint(A_MIN, A_MAX)
        b = randint(A_MIN, A_MAX)
        gen.input_writeln(a, b)
        ans_lines.append("%d %d" % (a + b, a * b))
    gen.output_raw("\n".join(ans_lines))   # 手动写答案（注意：输出为多行时必须覆盖多行用例）

# 若答案应由标程生成，删除上面 gen.output_raw，改为：
# gen.auto_output()    # 逐用例运行 STD，stdin 喂输入、stdout 存为答案

gen.pack()  # 按平台打包：luogu -> P1001-1.in/.out ...；hdu/poj/zoj/nowcoder -> 合并 .in/.out
