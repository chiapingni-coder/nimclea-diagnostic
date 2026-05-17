param(
  [Parameter(Mandatory=$true)]
  [string]$Code,

  [Parameter(Mandatory=$true)]
  [string]$Slug,

  [Parameter(Mandatory=$true)]
  [string]$Title
)

$ErrorActionPreference = "Stop"

$RepoPath = "E:\Nimclea_Products\diagnostic"
$DocsPath = Join-Path $RepoPath "docs"

Set-Location $RepoPath

$CleanCode = $Code.Trim().ToUpper()
$CleanSlug = $Slug.Trim().ToUpper() -replace "[^A-Z0-9]+", "_"
$CleanSlug = $CleanSlug.Trim("_")

$FileName = "NIMCLEA_${CleanCode}_${CleanSlug}_V0_1.md"
$FilePath = Join-Path $DocsPath $FileName

if (Test-Path $FilePath) {
  Write-Host ""
  Write-Host "FAILED: document already exists:"
  Write-Host $FilePath
  exit 1
}

$Today = Get-Date -Format "yyyy-MM-dd"

$Content = @"
# $Title

## Record ID

$CleanCode

## Date

$Today

## Purpose

This record documents the decision, implementation, rehearsal, or validation result for this Nimclea work item.

## Scope

- Area:
- Files inspected:
- Files changed:
- Runtime behavior affected:

## Decision / Change Summary

-

## Acceptance Criteria

-

## Validation

Commands / checks run:

```powershell
