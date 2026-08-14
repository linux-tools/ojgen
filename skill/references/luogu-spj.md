# 洛谷 Special Judge 指南

## 何时使用 SPJ

当一道题目的正确答案不唯一时，需要使用 Special Judge（SPJ）。SPJ 程序负责验证选手的输出是否合法。

## Checker 标准

洛谷采用与 Codeforces 一致的 Testlib 标准。

- 下载地址：<https://github.com/MikeMirzayanov/testlib/releases>
- 将 `testlib.h` 解压到与 `checker.cpp` 相同的目录。
- 洛谷在线编译参数：`g++ -fno-asm -std=c++14 -O2`。

## 输入流

Checker 中可使用三条输入流：

- `inf`：测试输入文件。
- `ans`：参考输出文件（可能是一组可行解，不一定唯一）。
- `ouf`：选手输出文件。

## 最小 Checker 模板

```cpp
#include "testlib.h"

int main(int argc, char* argv[]) {
    registerTestlibCmd(argc, argv);
    // 根据需要从 inf、ans、ouf 读取
    quitf(_ok, "correct");
}
```

## 常见返回结果

- `_ok`：答案正确（AC）。
- `_wa`：答案错误（WA）。
- `_pe`：格式错误（洛谷目前不完全支持该结果）。
- `_fail`：Checker 自身异常；**永远不要用它表示选手答案错误**。

## 常用读取函数

- `registerTestlibCmd(argc, argv)`：初始化 checker。
- `readChar()`、`readChar(c)`、`readSpace()`
- `readToken()`
- `readInt()`、`readInt(L, R)`
- `readLong()`、`readLong(L, R)`
- `readDouble()`、`readReal()`、`readStrictReal(...)`
- `readString()`、`readLine()`
- `readEoln()`、`readEof()`
- `skipBlanks()`、`seekEof()`

## 结束 Checker

必须以以下函数之一结束：

```cpp
quitf(_ok, "message");
quitf(_wa, "message");
quitp(0.5, "partially correct, 50%%");
```

## 打包

将 `checker.cpp` 放入测试数据压缩包中一同上传。在洛谷题目设置中务必添加“Special Judge”标签。

## 本地测试

```bash
# Linux
./checker in.txt out.txt ans.txt

# Windows
checker.exe in.txt out.txt ans.txt
```

其中 `in.txt`、`out.txt`、`ans.txt` 分别是输入文件、选手输出、标准答案。

## 重要提示

- 不要使用 `cin`/`cout` 读写判题数据，应使用 Testlib 提供的流。
- `ans` 文件中的答案可能只是众多合法解之一。
- 若需严格校验换行但不在乎行末空格，建议先调用 `skipBlanks()` 再调用 `readEoln()`，避免对选手输出格式要求过于苛刻。
