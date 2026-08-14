# CYaRon API 速查

## 安装

```bash
pip install cyaron
```

若无法使用 pip，可下载源码压缩包（<https://github.com/luogu-dev/cyuron/archive/master.zip>），解压后在根目录编写生成器脚本。

## 快速开始

```python
from cyaron import *

# 生成 3 组测试数据：heat1.in/out ~ heat3.in/out
_n = ati([0, 7, 50, 10000])
_m = ati([0, 11, 100, 10000])

for i in range(1, 4):
    test_data = IO(file_prefix="heat", data_id=i)
    n = _n[i]
    m = _m[i]
    s = randint(1, n)
    t = randint(1, n)
    test_data.input_writeln(n, m, s, t)

    graph = Graph.graph(n, m, weight_limit=5)
    test_data.input_writeln(graph)

    test_data.output_gen("std.exe")
```

## IO 输入输出

### 构造函数

```python
IO("test1.in", "test1.out")
IO(file_prefix="test")                     # test.in / test.out
IO(file_prefix="test", data_id=3)          # test3.in / test3.out
IO(file_prefix="test", data_id=6,
   input_suffix=".input", output_suffix=".answer")
IO("test2.in")                             # 输出为临时文件
IO(file_prefix="test", data_id=5, disable_output=True)
IO()                                       # 均为临时文件，常用于对拍
```

### 常用方法

```python
io = IO("test1.in", "test1.out")
io.input_write(1, 2, 3)              # 写入 1 2 3（不换行）
io.input_writeln(4, 5, 6)            # 写入 4 5 6 并换行
io.output_write(1, 2, 3)
io.output_writeln(4, 5, 6)
io.input_write([1, 2, 3])            # 写入 1 2 3
io.output_write(1, 2, [1, 2, 3], [4])
io.input_write(1, 2, 3, separator=',')   # 注意尾部会多一个逗号
io.output_gen("~/Documents/std")     # 执行命令/二进制，stdin 送入输入，stdout 作为输出
io.output_gen("C:\\Users\\Aqours\\std.exe")   # Windows
io.output_gen("./std")               # Linux/macOS 编译产物
io.output_gen("python3 std.py")      # Linux/macOS 下执行 Python 标程
```

## 图 Graph

### 手动建图

```python
graph = Graph(10)                    # 10 个节点的无向图
graph = Graph(10, directed=True)     # 10 个节点的有向图
graph.add_edge(1, 5)                 # 边权默认为 1
graph.add_edge(1, 6, weight=3)

for edge in graph.iterate_edges():
    edge.start    # 起点
    edge.end      # 终点
    edge.weight   # 边权

io.input_writeln(graph)              # 默认每行 u v w
io.input_writeln(graph.to_str(shuffle=True))
io.input_writeln(graph.to_str(output=Edge.unweighted_edge))  # u v 格式
```

### 随机图模板

```python
graph = Graph.graph(n, m)            # n 点 m 边无向图，边权为 1
graph = Graph.graph(n, m, directed=True, weight_limit=(5, 300))
graph = Graph.graph(n, m, weight_limit=20)
graph = Graph.graph(n, m, weight_gen=my_func)
graph = Graph.graph(n, m, self_loop=False, repeated_edges=False)

chain = Graph.chain(n)               # n 个节点的链
flower = Graph.flower(n)             # n 个节点的菊花图
tree = Graph.tree(n)                 # n 个节点的随机树
tree = Graph.tree(n, 0.4, 0.35)      # 40% 链状、35% 菊花状、25% 随机
binary_tree = Graph.binary_tree(n)
binary_tree = Graph.binary_tree(n, 0.4, 0.35)
graph = Graph.hack_spfa(n)
graph = Graph.hack_spfa(n, extra_edge=m)

# 以下保证连通，支持 self_loop/repeated_edges/weight_limit/weight_gen，DAG 默认无自环
graph = Graph.DAG(n, m)              # 有向无环图
graph = Graph.DAG(n, m, loop=True)   # 有向有环图
graph = Graph.UDAG(n, m)             # 无向连通图
```

## 字符串 String

```python
str = String.random(5)
str = String.random((10, 20), charset="abcd1234")
str = String.random(10, charset="#######...")   # 70% '#'，30% '.'
str = String.random(None, charset=["foo", "bar"])

str = String.random_sentence(5)
str = String.random_sentence(
    (10, 20),
    word_separators=",;",
    sentence_terminators=None,
    first_letter_uppercase=False,
    word_length_range=(2, 10),
    charset="abcdefg"
)

str = String.random_paragraph((3, 10))
str = String.random_paragraph(
    6,
    sentence_joiners="|",
    sentence_separators=",",
    sentence_terminators=".?",
    termination_percentage=0.1
)

# 以两个空格分割单词的正确写法
str = String.random_sentence(5, word_separators=["  "])
```

## 向量 Vector

```python
Vector.random(num=5, position_range=[10], mode=0)
```

参数说明：

- `num`：生成向量个数。
- `position_range`：每一维的范围。单个整数 `k` 表示 `[0, k]`；二元元组 `(min, max)` 表示 `[min, max]`。列表中有几个元素就是几维。
- `mode`：`0` 为互不重复的整数向量；`1` 为允许重复的整数向量；`2` 为实数向量。

示例：

```python
output = Vector.random()                         # 5 个 [0,10] 不重复数字
output = Vector.random(10, [(10, 50)])          # 10 个 [10,50] 不重复数字
output = Vector.random(30, [(10, 50), 20])      # 30 个二维不重复整数向量
output = Vector.random(30, [(1, 10), (1, 10), (1, 10)], 2)  # 30 个三维实数向量
output = Vector.random(30, [10], 1)             # 30 个 [0,10] 可重复数字

# 一维结果默认是 [[7], [110], ...]，展平为一维 list：
flat = sum(output, [])
```

## 序列 Sequence

```python
seq = Sequence(lambda i, f: 2 * i + 1)
seq = Sequence(lambda i, f: f(i - 1) + 1, [0, 1])
seq = Sequence(lambda i, f: f(i - 1) + 1, {100: 101, 102: 103})

seq.get(3)          # 第 3 项
seq.get(4, 6)       # 第 4 到 6 项（列表）
io.input_write(seq.get(7, 10))
```

## 多边形 Polygon

```python
p = Polygon([(0, 0), (0, 4), (4, 4), (4, 0)])
p.perimeter()
p.area()
io.input_writeln(p)

p = Polygon.convex_hull(n)      # n 个点的凸包
p = Polygon.simple_polygon(n)   # n 个点的简单多边形
```

## 区间查询 RangeQuery

```python
from cyaron import RangeQuery, RangeQueryRandomMode

n = randint(1, 10)
q = randint(1, 10)
Q = RangeQuery.random(q, [(1, n)])          # q 个 [1, n] 的区间查询
io.input_writeln(Q)

# 带权查询
Q = RangeQuery.random(
    q,
    [(1, n)],
    mode=RangeQueryRandomMode.LESS,         # 禁止 l == r
    weight_generator=lambda i, l, r: [randint(1, 100)],
    big_query=0.2
)
```

## 对拍器 Compare

### 对拍输出文件

```python
Compare.output("1.out", "2.out", std="std.out")

std_io = IO()
std_io.output_writeln(1, 2, 3)
Compare.output("1.out", "2.out", std=std_io)
```

### 对拍程序

```python
input_io = IO()
input_io.input_write("1111\n")
Compare.program("a.exe", input=input_io, std_program="std.exe")
Compare.program("a.exe", "b.exe", input=input_io, std_program="std.exe")

while True:
    input_io = IO()
    input_io.input_writeln(randint(1, 100))
    Compare.program("a.exe", "b.exe", input=input_io, std_program="std.exe")
```

### 自定义比较器

```python
from cyaron import *
from cyaron.graders import CYaRonGraders

@CYaRonGraders.grader("MyGrader")
def my_grader(content, std):
    if is_correct:                 # 替换为实际判断逻辑
        return True, None
    else:
        return False, "Answer incorrect!"

Compare.program("a.exe", input=input_io, std_program="std.exe", grader="MyGrader")
```

## 数学函数

通过 `from cyaron import *` 导入。

```python
factorial(n)              # n 的阶乘
is_perm(a, b)             # 判断 a、b 是否为同数字排列
is_palindromic(n)         # 判断回文数/串
is_pandigital(n, s=9)     # 判断 1..s 全数字
d(n)                      # 真因数之和
pal_list(k)               # 所有 k 位回文数列表
sof_digits(n)             # 各位阶乘之和
fibonacci(n)              # 第 n 个斐波那契数
sos_digits(n)             # 各位平方之和
pow_digits(n, e)          # 各位 e 次幂之和
is_prime(n)               # 素性判断
miller_rabin(n, repeat_time=20)   # Miller-Rabin 素性测试
factor(n)                 # 质因数分解 [(p, exp), ...]
perm(n, s)                # 字符串 s 的第 n 个排列（0 起）
binomial(n, k)            # 组合数 C(n,k)
catalan_number(n)         # 第 n 个卡特兰数
prime_sieve(n)            # 小于 n 的所有素数
exgcd(a, b)               # 扩展欧几里得，返回 (u, v, gcd)
mod_inverse(a, b)         # a 在模 b 下的逆元
phi(x)                    # 欧拉函数
miu(x)                    # 莫比乌斯函数
dec2base(n, base)         # 十进制转 base 进制（2-16）
n2words(num, join=True)   # 数字转英文单词
anti_primes_up_to(n, use_primes=47)   # 1..n 中的反素数记录
```

## 常用常数

```python
PI                 # 3.1415926...
E                  # 2.7182818...
ALPHABET_SMALL     # "abcdefghijklmnopqrstuvwxyz"
ALPHABET_CAPITAL   # "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
ALPHABET           # 大小写字母
NUMBERS            # "0123456789"
SENTENCE_SEPARATORS
SENTENCE_TERMINATORS
DEFAULT_GRADER     # "NOIPStyle"
```

## 工具函数

```python
ati([0, 7, 50, 1E4])      # [0, 7, 50, 10000]，将元素转整数
list_like(data)            # 是否为 list/tuple
int_like(data)             # 是否为整数类型
strtolines(string)         # 按换行拆分并去除行尾空格和末尾空行
make_unicode(data)         # 转字符串
```

### 命令行参数

CYaRon 支持 `--randseed=` 设置随机种子：

```bash
python gen.py --randseed=12345
```

## 提高效率

- 大量循环建议使用 PyPy。
- 在 Python 2 中，大循环使用 `xrange` 代替 `range`。
