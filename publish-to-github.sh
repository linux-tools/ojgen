#!/usr/bin/env bash
# OJ 练习题数据生成器 — GitHub 发布脚本（Linux / macOS 版；Windows 用 publish-to-github.ps1）
# 用法（在本机执行）：
#
#   方式一：GitHub CLI
#     gh auth login
#     ./publish-to-github.sh -n ojgen
#
#   方式二：Personal Access Token（fine-grained 需 Contents:Read/Write + Administration:Read/Write + Metadata:Read）
#     GH_TOKEN=github_pat_xxx ./publish-to-github.sh -n ojgen
#
# 参数：-n 仓库名（默认 ojgen，创建到 github.com/linux-tools/<name>）；-v private 可建私有仓库

set -euo pipefail

OWNER="linux-tools"
REPO_NAME="ojgen"
VISIBILITY="public"
DESC="Multi-platform OJ test data generator: generate problem test data for Luogu / HDOJ / POJ / ZOJ / Nowcoder / LeetCode using CYaRon"
TOPICS='["oj","cyaron","test-data","data-generator","oj-tools","competitive-programming","luogu","leetcode","algorithm"]'

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n) REPO_NAME="$2"; shift 2 ;;
    -v) VISIBILITY="$2"; shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -d "$ROOT/.git" ]] || { echo "错误：未找到 .git，请在 ojgen-project 目录执行"; exit 1; }

TOKEN="${GH_TOKEN:-}"
API="https://api.github.com"

if [[ -z "$TOKEN" ]] && command -v gh >/dev/null 2>&1; then
  echo "==> 使用 gh CLI 创建仓库 $OWNER/$REPO_NAME（$VISIBILITY）"
  gh repo create "$OWNER/$REPO_NAME" --"$VISIBILITY" --description "$DESC" --source "$ROOT" --remote origin --push
  gh repo edit "$OWNER/$REPO_NAME" --add-topic oj,cyaron,test-data,data-generator,oj-tools,competitive-programming,luogu,leetcode,algorithm
else
  [[ -n "$TOKEN" ]] || { echo "错误：未提供 GH_TOKEN 且未安装 gh CLI"; exit 1; }
  AUTH="Authorization: Bearer $TOKEN"
  echo "==> 1/3 创建仓库 $OWNER/$REPO_NAME（$VISIBILITY）"
  curl -fsS -X POST "$API/user/repos" -H "$AUTH" -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" -H "Content-Type: application/json" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"$DESC\",\"private\":$([[ "$VISIBILITY" == "private" ]] && echo true || echo false)}" || true

  echo "==> 2/3 推送 main"
  git -C "$ROOT" remote remove origin 2>/dev/null || true
  git -C "$ROOT" remote add origin "https://x-access-token:$TOKEN@github.com/$OWNER/$REPO_NAME.git"
  git -C "$ROOT" push -u origin main

  echo "==> 3/3 设置 topics"
  curl -fsS -X PUT "$API/repos/$OWNER/$REPO_NAME/topics" -H "$AUTH" \
    -H "Accept: application/vnd.github+json" -H "Content-Type: application/json" \
    -d "{\"names\":$TOPICS}" || echo "（topics 设置失败，可忽略）"
fi

echo ""
echo "完成！仓库地址：https://github.com/$OWNER/$REPO_NAME"
[[ -n "$TOKEN" ]] && echo "提示：Token 方式下 remote 含令牌，建议执行：git -C \"$ROOT\" remote set-url origin https://github.com/$OWNER/$REPO_NAME.git"
