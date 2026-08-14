#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""示例：HDOJ/POJ/ZOJ/牛客 ACM 模式（stdin/stdout，EOF 多组）。

题目：每组一行两个整数 a b（a+b 问题），多组到 EOF。
生成合并文件 <pid>.in/.out 与 cases/ 分用例文件。
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ojgen import Gen, randint  # noqa: E402

gen = Gen(platform="hdu",      # 可换成 poj / zoj / nowcoder
          problem_id="1000",
          n=10,
          out_dir="data/hdu1000",
          seed=20260815)

for i in gen.cases():
    # 小用例 + 大用例混合，覆盖边界
    if i == 1:
        a, b = 1, 2                      # 样例级小数据
    elif i == 2:
        a, b = 10**9, 10**9              # 最大值边界
    else:
        a, b = randint(0, 10**9), randint(0, 10**9)
    gen.input_writeln(a, b)
    gen.output_writeln(a + b)            # 手动答案；也可 gen.auto_output("python std.py")

gen.pack()  # 生成 1000.in / 1000.out（EOF 多组拼接）+ cases/
