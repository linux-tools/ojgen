# OJ 练习题数据生成器 — GitHub 一键发布脚本
# 用法（在本机 PowerShell 中执行，不要在沙箱内执行）：
#
#   方式一：用 GitHub CLI（需先 gh auth login）
#     .\publish-to-github.ps1 -RepoName ojgen
#
#   方式二：用 Personal Access Token（classic 需 repo 权限；fine-grained 需
#            Contents:Read/Write + Administration:Read/Write + Metadata:Read）
#     $env:GH_TOKEN = "github_pat_..."     # 或
#     .\publish-to-github.ps1 -RepoName ojgen -Token github_pat_...
#
# 参数说明：
#   -RepoName      仓库名（默认 ojgen），将创建到 https://github.com/linux-tools/<RepoName>
#   -Token         PAT；缺省时读取 $env:GH_TOKEN
#   -Description   仓库描述（默认中文简介）
#   -Visibility    public / private（默认 public）

param(
    [string]$RepoName = "ojgen",
    [string]$Token = "",
    [string]$Description = "多平台 OJ 练习题测试数据生成器：基于 CYaRon 为洛谷 / HDOJ / POJ / ZOJ / 牛客 / LeetCode 生成题目数据",
    [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"
$Owner = "linux-tools"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path "$RepoRoot\.git")) { throw "未找到 .git，请确认在 ojgen-project 目录执行" }

if (-not $Token) { $Token = $env:GH_TOKEN }
if (-not $Token -and -not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "未提供 Token（-Token 或 \$env:GH_TOKEN），且本机没有 gh CLI。请先 gh auth login 或设置 Token。"
}

Write-Host "==> 1/3 创建仓库 $Owner/$RepoName（$Visibility）" -ForegroundColor Cyan
if (Get-Command gh -ErrorAction SilentlyContinue -and -not $Token) {
    # 走 gh CLI
    gh repo create "$Owner/$RepoName" --$Visibility --description $Description --source $RepoRoot --remote origin --push
    gh repo edit "$Owner/$RepoName" --add-topic oj,cyaron,test-data,data-generator,oj-tools,competitive-programming
} else {
    # 走 REST API
    $headers = @{ Authorization = "Bearer $Token"; Accept = "application/vnd.github+json"; "X-GitHub-Api-Version" = "2022-11-28" }
    $body = @{
        name        = $RepoName
        description = $Description
        private     = ($Visibility -eq "private")
        auto_init   = $false
    } | ConvertTo-Json

    $null = Invoke-RestMethod -Method Post -Uri "https://api.github.com/user/repos" -Headers $headers -Body $body -ContentType "application/json"

    Write-Host "==> 2/3 推送 main 分支" -ForegroundColor Cyan
    git -C $RepoRoot remote remove origin 2>$null
    git -C $RepoRoot remote add origin "https://x-access-token:$Token@github.com/$Owner/$RepoName.git"
    git -C $RepoRoot push -u origin main

    Write-Host "==> 3/3 设置 topics" -ForegroundColor Cyan
    try {
        $null = Invoke-RestMethod -Method Put -Uri "https://api.github.com/repos/$Owner/$RepoName/topics" -Headers $headers -Body (@{ names = @("oj", "cyaron", "test-data", "data-generator", "oj-tools", "competitive-programming") } | ConvertTo-Json) -ContentType "application/json"
    } catch { Write-Warning "设置 topics 失败（可忽略）: $($_.Exception.Message)" }
}

Write-Host ""
Write-Host "完成！仓库地址：https://github.com/$Owner/$RepoName" -ForegroundColor Green
Write-Host "提示：若用 Token 方式，remote origin 中包含 Token，建议发布后执行" -ForegroundColor Yellow
Write-Host "  git -C `"$RepoRoot`" remote set-url origin https://github.com/$Owner/$RepoName.git" -ForegroundColor Yellow
