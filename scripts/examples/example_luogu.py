#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""示例：洛谷（每测试点独立 .in/.out，子任务风格范围）。

题目：给定 n 与 n 个整数，输出这些整数的和。
子任务 1（用例 1-4）：n <= 10；子任务 2（用例 5-10）：n <= 10^5。
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ojgen import Gen, randint  # noqa: E402

gen = Gen(platform="luogu",
          problem_id="P1001",
          n=10,
          out_dir="data/luogu_p1001",
          seed=20260815)

for i in gen.cases():
    if i <= 4:                          # 子任务 1：小数据
        n = randint(1, 10)
        a = [randint(-10**3, 10**3) for _ in range(n)]
    elif i == 5:                        # 子任务 2 边界：最大规模
        n = 10**5
        a = [randint(-10**9, 10**9) for _ in range(n)]
    else:                               # 子任务 2：随机大数据
        n = randint(10**4, 10**5)
        a = [randint(-10**9, 10**9) for _ in range(n)]
    gen.input_writeln(n)
    gen.input_writeln(a)
    gen.output_writeln(sum(a))          # 手动答案；也可 gen.auto_output("std.exe")

gen.pack()  # 生成 P1001-1.in/.out ... P1001-10.in/.out
