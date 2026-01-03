@echo off
REM MCP Pentester CLI - Publish Script (Windows)
REM This script helps publish new versions to npm

setlocal enabledelayedexpansion

REM Check if version type is provided
if "%~1"=="" (
    echo [ERROR] Usage: publish.bat [patch^|minor^|major^|version]
    echo.
    echo Examples:
    echo   publish.bat patch    # Bump patch version (1.0.0 -^> 1.0.1)
    echo   publish.bat minor    # Bump minor version (1.0.0 -^> 1.1.0)
    echo   publish.bat major    # Bump major version (1.0.0 -^> 2.0.0)
    echo   publish.bat 1.2.3    # Set specific version
    exit /b 1
)

set VERSION_TYPE=%~1

REM Check if logged in to npm
echo [INFO] Checking npm login status...
npm whoami >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not logged in to npm. Please run: npm login
    exit /b 1
)

for /f "delims=" %%i in ('npm whoami') do set NPM_USER=%%i
echo [INFO] Logged in as: !NPM_USER!

REM Get current version
for /f "delims=" %%i in ('node -p "require('./package.json').version"') do set CURRENT_VERSION=%%i
echo [INFO] Current version: !CURRENT_VERSION!

REM Determine new version
echo %VERSION_TYPE% | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
if errorlevel 1 (
    echo [INFO] Bumping %VERSION_TYPE% version...
    call npm version %VERSION_TYPE% --no-git-tag-version >nul
    for /f "delims=" %%i in ('node -p "require('./package.json').version"') do set NEW_VERSION=%%i
) else (
    set NEW_VERSION=%VERSION_TYPE%
    call npm version %NEW_VERSION% --no-git-tag-version >nul
)
echo [INFO] New version: !NEW_VERSION!

REM Build the project
echo [INFO] Building project...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed!
    exit /b 1
)

if not exist "dist" (
    echo [ERROR] dist directory not found!
    exit /b 1
)

echo [INFO] Build successful!

REM Confirm before publishing
echo.
echo [WARN] Ready to publish version !NEW_VERSION! to npm
set /p CONFIRM="Continue with publish? (y/N): "
if /i not "!CONFIRM!"=="y" (
    echo [ERROR] Publishing cancelled.
    call npm version !CURRENT_VERSION! --no-git-tag-version >nul
    exit /b 1
)

REM Publish to npm (with public access for scoped package)
echo [INFO] Publishing to npm...
call npm publish --access public
if errorlevel 1 (
    echo [ERROR] Publishing failed!
    call npm version !CURRENT_VERSION! --no-git-tag-version >nul
    exit /b 1
)

echo [INFO] Successfully published version !NEW_VERSION!
echo.
echo [INFO] Next steps:
echo   1. Create a git tag: git tag v!NEW_VERSION!
echo   2. Push tags: git push origin v!NEW_VERSION!
echo   3. Update CHANGELOG.md with release notes
echo   4. Commit version change: git add package.json ^&^& git commit -m "chore: bump version to !NEW_VERSION!"
echo   5. Push changes: git push

