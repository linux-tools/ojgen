#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""示例：LeetCode / 牛客核心代码模式（testcases.txt + answers.txt）。

题目：两数之和。参数 nums（数组）、target（整数）；答案：两个下标。
每个用例占 2 行（每参数一行 JSON），answers.txt 每行一个答案 JSON。
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ojgen import Gen, randint  # noqa: E402

gen = Gen(platform="leetcode",  # 牛客核心代码模式改为 "nowcoder_core"
          problem_id="two-sum",
          n=8,
          out_dir="data/leetcode_two_sum",
          seed=20260815)

for i in gen.cases():
    n = randint(2, 8) if i <= 4 else randint(2, 10**4)   # 小数据 + 大数据
    nums = [randint(-10**9, 10**9) for _ in range(n)]
    if i == 1:
        nums, ans = [2, 7, 11, 15], [0, 1]                # 与题面样例一致
        target = 9
    else:
        # 关键：先随机定解再构造 target，保证数据必有解（除非题面允许无解）
        p, q = sorted(randint(0, n - 1) for _ in range(2))
        while p == q:
            p, q = sorted(randint(0, n - 1) for _ in range(2))
        target = nums[p] + nums[q]
        ans = [p, q]
    gen.input_json(nums)        # 第 1 个参数：数组
    gen.input_json(target)      # 第 2 个参数：整数
    gen.output_json(ans)        # 手动答案；大数据建议用 runner + auto_output

# 或者：把 Solution 包装成 runner.py（见 references/platform-formats.md），然后
# gen.auto_output("python runner.py")

gen.pack()  # 生成 testcases.txt / answers.txt + cases/
